import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser, hasValidCronSecret, isAdminUser } from '@/lib/server/trust';
import { z } from 'zod';

const OpenRandomAuditSchema = z.object({
    subject_user_id: z.string().uuid(),
    claim_id: z.string().uuid(),
    note: z.preprocess(
        (value) => (typeof value === 'string' ? value.trim() : value),
        z.string().min(1).max(2000).optional()
    ).default('Random audit opened'),
});

type OpenRandomAuditRpcResult = {
    ok?: boolean;
    error?: string;
    message?: string;
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
        case 'BAD_REQUEST':
            return 400;
        default:
            return 400;
    }
}

async function canOpenRandomAudit(req: Request): Promise<{ allowed: boolean; actorId: string | null }> {
    if (hasValidCronSecret(req)) {
        return { allowed: true, actorId: null };
    }

    const user = await getSessionUser();
    if (!user) {
        return { allowed: false, actorId: null };
    }

    const admin = getServiceRoleClient();
    const allowed = await isAdminUser(admin, user.id);
    return { allowed, actorId: user.id };
}

export async function POST(req: Request) {
    try {
        const auth = await canOpenRandomAudit(req);
        if (!auth.allowed) {
            return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = OpenRandomAuditSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'subject_user_id and claim_id are required' },
                { status: 400 }
            );
        }
        const { subject_user_id: subjectUserId, claim_id: claimId, note } = parsed.data;

        const admin = getServiceRoleClient();
        const { data: rpcData, error: rpcError } = await admin.rpc('open_random_audit_and_freeze', {
            p_subject_user_id: subjectUserId,
            p_claim_id: claimId,
            p_note: note,
            p_decision_by: auth.actorId
        });

        if (rpcError) {
            return NextResponse.json(
                { error: 'AUDIT_OPEN_FAILED', message: rpcError.message },
                { status: 500 }
            );
        }

        const result = (rpcData ?? {}) as OpenRandomAuditRpcResult;
        if (result.ok !== true) {
            const errorCode = typeof result.error === 'string' ? result.error : 'BAD_REQUEST';
            return NextResponse.json(
                {
                    error: errorCode,
                    message: result.message || 'Failed to open random audit',
                    audit_id: result.audit_id || null
                },
                { status: mapRpcErrorToStatus(errorCode) }
            );
        }

        const auditId = typeof result.audit_id === 'string' ? result.audit_id : null;
        const freezeActionId = typeof result.freeze_action_id === 'string' ? result.freeze_action_id : null;

        return NextResponse.json({
            success: true,
            audit_id: auditId,
            freeze_action: freezeActionId ? { id: freezeActionId, due_process_state: 'NOTIFIED' } : null
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
