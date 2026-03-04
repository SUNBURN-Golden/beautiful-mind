import { NextResponse } from 'next/server';
import {
    getServiceRoleClient,
    getSessionUser,
    hasValidCronSecret,
    isAdminUser
} from '@/lib/server/trust';
import { z } from 'zod';

const DecideSchema = z.object({
    audit_id: z.string().uuid(),
    decision: z.preprocess(
        (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
        z.enum(['PASS', 'FAIL'])
    ),
    slash_amount: z.preprocess(
        (value) => (value === undefined || value === null || value === '' ? 0 : value),
        z.coerce.number().int().min(0).max(1_000_000_000)
    ),
    note: z.preprocess(
        (value) => (typeof value === 'string' ? value.slice(0, 2000) : value),
        z.string().max(2000).nullable().optional()
    ).default(null),
});

type DecideAuditRpcResult = {
    ok?: boolean;
    error?: string;
    message?: string;
    audit_id?: string;
    decision?: 'PASS' | 'FAIL';
    claim_status?: string;
    trust_level?: string;
    collateral_balance?: number;
    queued_enforcement?: unknown;
};

function mapRpcErrorToStatus(errorCode: string): number {
    switch (errorCode) {
        case 'BAD_REQUEST':
            return 400;
        case 'AUDIT_NOT_FOUND':
        case 'CLAIM_NOT_FOUND':
            return 404;
        case 'AUDIT_ALREADY_DECIDED':
        case 'COLLATERAL_REQUIRED_FOR_HIGH_TRUST':
            return 409;
        default:
            return 400;
    }
}

function isMissingAtomicRpc(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const message = error.message || '';
    return (
        message.includes('decide_audit_atomic')
        || message.includes('Could not find the function')
        || error.code === 'PGRST202'
    );
}

async function canDecideAudit(req: Request): Promise<{ allowed: boolean; actorId: string | null }> {
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
        const auth = await canDecideAudit(req);
        if (!auth.allowed) {
            return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = DecideSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'audit_id and decision(PASS|FAIL) are required' },
                { status: 400 }
            );
        }
        const {
            audit_id: auditId,
            decision,
            slash_amount: slashAmount,
            note,
        } = parsed.data;

        const admin = getServiceRoleClient();
        const { data: rpcData, error: rpcError } = await admin.rpc('decide_audit_atomic', {
            p_audit_id: auditId,
            p_decision: decision,
            p_slash_amount: slashAmount,
            p_note: note,
            p_decision_by: auth.actorId
        });

        if (rpcError) {
            if (isMissingAtomicRpc(rpcError)) {
                return NextResponse.json(
                    {
                        error: 'ATOMIC_RPC_MISSING',
                        message: 'decide_audit_atomic RPC is required in this environment'
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { error: 'AUDIT_DECIDE_FAILED', message: rpcError.message },
                { status: 500 }
            );
        }

        const result = (rpcData ?? {}) as DecideAuditRpcResult;
        if (result.ok !== true) {
            const errorCode = typeof result.error === 'string' ? result.error : 'BAD_REQUEST';
            return NextResponse.json(
                {
                    error: errorCode,
                    message: result.message || 'Failed to decide audit',
                    audit_id: result.audit_id || auditId,
                    collateral_balance: typeof result.collateral_balance === 'number' ? result.collateral_balance : undefined
                },
                { status: mapRpcErrorToStatus(errorCode) }
            );
        }

        if (result.decision === 'PASS') {
            return NextResponse.json({
                success: true,
                audit_id: result.audit_id || auditId,
                decision: 'PASS',
                claim_status: result.claim_status || 'ACTIVE',
                trust_level: result.trust_level || 'HIGH'
            });
        }

        return NextResponse.json({
            success: true,
            audit_id: result.audit_id || auditId,
            decision: 'FAIL',
            claim_status: result.claim_status || 'DISHONORED',
            queued_enforcement: result.queued_enforcement || null
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
