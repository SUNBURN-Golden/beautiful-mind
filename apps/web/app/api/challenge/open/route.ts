import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { z } from 'zod';

const ChallengeSchema = z.object({
    subject_user_id: z.string().uuid(),
    claim_id: z.string().uuid(),
    evidence_ref: z.string().trim().min(1).max(512),
    note: z.preprocess(
        (value) => (typeof value === 'string' ? value.slice(0, 2000) : value),
        z.string().max(2000).nullable().optional()
    ).default(null),
});

type OpenChallengeRpcResult = {
    ok?: boolean;
    error?: string;
    message?: string;
    challenge_id?: string;
    audit_id?: string;
    freeze_action_id?: string;
};

function mapRpcErrorToStatus(errorCode: string): number {
    switch (errorCode) {
        case 'CLAIM_NOT_FOUND':
            return 404;
        case 'AUDIT_ALREADY_OPEN':
        case 'CLAIM_REVOKED':
            return 409;
        case 'SELF_CHALLENGE':
        case 'BAD_REQUEST':
            return 400;
        default:
            return 400;
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = ChallengeSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'subject_user_id, claim_id, evidence_ref are required' },
                { status: 400 }
            );
        }
        const { subject_user_id: subjectUserId, claim_id: claimId, evidence_ref: evidenceRef, note } = parsed.data;

        if (subjectUserId === user.id) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'Self-challenge is not allowed' },
                { status: 400 }
            );
        }

        const admin = getServiceRoleClient();
        const { data: rpcData, error: rpcError } = await admin.rpc('open_challenge_audit_and_freeze', {
            p_challenger_user_id: user.id,
            p_subject_user_id: subjectUserId,
            p_claim_id: claimId,
            p_evidence_ref: evidenceRef,
            p_note: note
        });

        if (rpcError) {
            return NextResponse.json(
                { error: 'CHALLENGE_CREATE_FAILED', message: rpcError.message },
                { status: 500 }
            );
        }

        const result = (rpcData ?? {}) as OpenChallengeRpcResult;
        if (result.ok !== true) {
            const errorCode = typeof result.error === 'string' ? result.error : 'BAD_REQUEST';
            return NextResponse.json(
                {
                    error: errorCode,
                    message: result.message || 'Failed to open challenge',
                    audit_id: result.audit_id || null
                },
                { status: mapRpcErrorToStatus(errorCode) }
            );
        }

        const challengeId = typeof result.challenge_id === 'string' ? result.challenge_id : null;
        const auditId = typeof result.audit_id === 'string' ? result.audit_id : null;
        const freezeActionId = typeof result.freeze_action_id === 'string' ? result.freeze_action_id : null;

        return NextResponse.json({
            success: true,
            challenge_id: challengeId,
            audit_id: auditId,
            freeze_action: freezeActionId ? { id: freezeActionId, due_process_state: 'NOTIFIED' } : null
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
