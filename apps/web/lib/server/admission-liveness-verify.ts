import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    ADMISSION_POLICY_VERSION,
    buildAttestationHash,
    ensureAdmissionApplication,
} from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

export const LivenessVerificationPayloadSchema = z.object({
    provider: z.string().trim().min(1).max(64).default('mvp_stub'),
    confidence: z.coerce.number().min(0).max(1).default(0.99),
    media_ref: z.string().trim().max(256).nullable().optional().default(null),
    immediate_purge_confirmed: z.boolean().default(true),
});

export type LivenessVerificationPayload = z.infer<typeof LivenessVerificationPayloadSchema>;

type LivenessVerificationResult = {
    status: number;
    payload: Record<string, unknown>;
};

export async function verifyLivenessForUser(
    admin: SupabaseClient,
    userId: string,
    payload: LivenessVerificationPayload,
    now = () => new Date(),
): Promise<LivenessVerificationResult> {
    if (!payload.immediate_purge_confirmed) {
        return {
            status: 400,
            payload: {
                error: 'PURGE_CONFIRM_REQUIRED',
                message: 'Immediate purge confirmation is required',
            },
        };
    }

    const { data: identity } = await admin
        .from('identity_claims')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!identity) {
        return {
            status: 409,
            payload: {
                error: 'IDENTITY_REQUIRED',
                message: 'Identity verification must be completed first.',
            },
        };
    }

    const { application } = await ensureAdmissionApplication(admin, userId);
    const nowIso = now().toISOString();

    const { error: claimError } = await admin
        .from('verified_claims')
        .insert({
            user_id: userId,
            claim_type: 'REAL_PERSON_VERIFIED',
            claim_value_normalized: {
                real_person_verified: true,
                provider: payload.provider,
                confidence: payload.confidence,
            },
            source_document_type: null,
            verification_method: 'LIVENESS_CHECK',
            verification_status: 'VERIFIED',
            verified_at: nowIso,
            policy_version: ADMISSION_POLICY_VERSION,
            attestation_hash: buildAttestationHash(userId, 'REAL_PERSON_VERIFIED', {
                real_person_verified: true,
                provider: payload.provider,
                confidence: payload.confidence,
            }),
        });

    if (claimError && claimError.code !== '23505') {
        return {
            status: 500,
            payload: {
                error: 'LIVENESS_CLAIM_FAILED',
                message: claimError.message,
            },
        };
    }

    const { error: appError } = await admin
        .from('admission_applications')
        .update({
            status: 'IN_PROGRESS',
            current_step: 'CONSENTS',
            liveness_verified_at: nowIso,
        })
        .eq('id', application.id);

    if (appError) {
        return {
            status: 500,
            payload: {
                error: 'APPLICATION_UPDATE_FAILED',
                message: appError.message,
            },
        };
    }

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId: application.id,
        eventType: 'LIVENESS_VERIFIED',
        payload: {
            provider: payload.provider,
            confidence: payload.confidence,
            verified_at: nowIso,
        },
    });

    if (payload.media_ref) {
        await writeTrustLedgerEvent(admin, {
            userId,
            applicationId: application.id,
            eventType: 'LIVENESS_MEDIA_PURGED',
            payload: {
                media_ref: payload.media_ref,
                purged_at: nowIso,
            },
        });
    }

    return {
        status: 200,
        payload: {
            success: true,
            verified: true,
            next_step: 'CONSENTS',
        },
    };
}
