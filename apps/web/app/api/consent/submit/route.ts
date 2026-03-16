import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import {
    ADMISSION_POLICY_VERSION,
    REQUIRED_CONSENT_TYPES,
    ensureAdmissionApplication,
    isAdmissionConsentType,
    isValidConsentAckPhrase,
    normalizeAckPhrase,
} from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

const ConsentItemSchema = z.object({
    consent_type: z.string(),
    granted: z.boolean(),
    typed_ack_phrase: z.string().trim().min(1).max(200),
});

const ConsentSubmitSchema = z.object({
    policy_version: z.string().trim().min(1).max(64).optional().default(ADMISSION_POLICY_VERSION),
    consents: z.array(ConsentItemSchema).min(1),
});

function parseClientIp(req: Request): string | null {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        return first || null;
    }
    return req.headers.get('x-real-ip');
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = ConsentSubmitSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid consent payload' },
                { status: 400 },
            );
        }

        const policyVersion = parsed.data.policy_version || ADMISSION_POLICY_VERSION;
        const normalizedConsents = parsed.data.consents.map((consent) => ({
            consent_type: consent.consent_type,
            granted: consent.granted,
            typed_ack_phrase: normalizeAckPhrase(consent.typed_ack_phrase),
        }));

        const consentMap = new Map<string, { granted: boolean; typed_ack_phrase: string }>();
        for (const consent of normalizedConsents) {
            if (isAdmissionConsentType(consent.consent_type)) {
                consentMap.set(consent.consent_type, {
                    granted: consent.granted,
                    typed_ack_phrase: consent.typed_ack_phrase,
                });
            }
        }

        const missing = REQUIRED_CONSENT_TYPES.filter((consentType) => !consentMap.has(consentType));
        if (missing.length > 0) {
            return NextResponse.json(
                {
                    error: 'CONSENT_MISSING',
                    message: 'All required admission consents must be submitted separately.',
                    missing_consents: missing,
                },
                { status: 400 },
            );
        }

        for (const consentType of REQUIRED_CONSENT_TYPES) {
            const submitted = consentMap.get(consentType);
            if (!submitted?.granted) {
                return NextResponse.json(
                    {
                        error: 'CONSENT_NOT_GRANTED',
                        message: `${consentType} must be granted.`,
                        consent_type: consentType,
                    },
                    { status: 400 },
                );
            }

            if (!isValidConsentAckPhrase(consentType, submitted.typed_ack_phrase)) {
                return NextResponse.json(
                    {
                        error: 'INVALID_ACK_PHRASE',
                        message: 'Typed acknowledgement phrase mismatch.',
                        consent_type: consentType,
                    },
                    { status: 400 },
                );
            }
        }

        const admin = getServiceRoleClient();
        const { application } = await ensureAdmissionApplication(admin, user.id);
        if (!application.liveness_verified_at) {
            return NextResponse.json(
                {
                    error: 'LIVENESS_REQUIRED',
                    message: 'Liveness verification must be completed before consent submission.',
                },
                { status: 409 },
            );
        }

        const nowIso = new Date().toISOString();
        const ipAddress = parseClientIp(req);
        const userAgent = req.headers.get('user-agent') || null;

        const insertRows = REQUIRED_CONSENT_TYPES.map((consentType) => {
            const submitted = consentMap.get(consentType)!;
            return {
                user_id: user.id,
                consent_type: consentType,
                policy_version: policyVersion,
                granted_at: nowIso,
                typed_ack_phrase: submitted.typed_ack_phrase,
                capture_method: 'web_form',
                ip_address: ipAddress,
                user_agent: userAgent,
                audit_reference: `consent:${user.id}:${consentType}:${nowIso}`,
            };
        });

        const { error: insertError } = await admin
            .from('consent_events')
            .insert(insertRows);

        if (insertError) {
            return NextResponse.json(
                { error: 'CONSENT_INSERT_FAILED', message: insertError.message },
                { status: 500 },
            );
        }

        const { error: appUpdateError } = await admin
            .from('admission_applications')
            .update({
                status: 'IN_PROGRESS',
                current_step: ADMISSION_STAGES.DOCUMENTS,
                policy_version: policyVersion,
            })
            .eq('id', application.id);

        if (appUpdateError) {
            return NextResponse.json(
                { error: 'APPLICATION_UPDATE_FAILED', message: appUpdateError.message },
                { status: 500 },
            );
        }

        await writeTrustLedgerEvent(admin, {
            userId: user.id,
            applicationId: application.id,
            eventType: 'CONSENTS_CAPTURED',
            payload: {
                policy_version: policyVersion,
                consent_types: REQUIRED_CONSENT_TYPES,
                granted_at: nowIso,
            },
        });

        return NextResponse.json({
            success: true,
            policy_version: policyVersion,
            next_step: ADMISSION_STAGES.DOCUMENTS,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
