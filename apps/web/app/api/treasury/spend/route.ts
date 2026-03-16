import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser, hasValidCronSecret, isAdminUser } from '@/lib/server/trust';
import { mapTreasurySpendStatusToHttp } from '@/lib/server/tokenomics-core';
import { spendTreasuryWithBudget } from '@/lib/server/soul-ledger';
import { z } from 'zod';

const TreasurySpendSchema = z.object({
    vault: z.enum(['OPS', 'REWARD', 'INSURANCE', 'EXPERIMENT']),
    amount: z.coerce.number().int().positive().max(1_000_000_000),
    related_id: z.string().uuid().nullable().optional().default(null),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
    note: z.string().trim().max(500).optional(),
});

type TreasurySpendRpcResult = {
    status?: string;
    budget_id?: string | null;
    vault?: string;
    amount?: number;
    outflow_used?: number;
    max_outflow?: number;
    ledger_id?: string | null;
};

async function canSpendTreasury(req: Request): Promise<{ allowed: boolean; actorId: string | null; actorType: 'CRON' | 'ADMIN' }> {
    if (hasValidCronSecret(req)) {
        return { allowed: true, actorId: null, actorType: 'CRON' };
    }

    const user = await getSessionUser();
    if (!user) {
        return { allowed: false, actorId: null, actorType: 'ADMIN' };
    }

    const admin = getServiceRoleClient();
    const allowed = await isAdminUser(admin, user.id);
    return { allowed, actorId: user.id, actorType: 'ADMIN' };
}

export async function POST(req: Request) {
    try {
        const auth = await canSpendTreasury(req);
        if (!auth.allowed) {
            return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = TreasurySpendSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'vault and amount are required' },
                { status: 400 }
            );
        }

        const { vault, amount, related_id: relatedId, idempotency_key: idempotencyKey, note } = parsed.data;
        const admin = getServiceRoleClient();
        let result: TreasurySpendRpcResult;
        try {
            result = await spendTreasuryWithBudget(admin, {
                vault,
                amount,
                relatedId,
                idempotencyKey: idempotencyKey ?? null,
                meta: {
                    source: 'api/treasury/spend',
                    actor_type: auth.actorType,
                    actor_id: auth.actorId,
                    note: note ?? null,
                },
            }) as TreasurySpendRpcResult;
        } catch (rpcError: unknown) {
            const message = rpcError instanceof Error ? rpcError.message : 'treasury_spend_with_budget failed';
            return NextResponse.json({ error: 'TREASURY_SPEND_FAILED', message }, { status: 500 });
        }
        const status = typeof result.status === 'string' ? result.status : 'UNKNOWN';
        const httpStatus = mapTreasurySpendStatusToHttp(status);

        return NextResponse.json({
            success: status === 'SPENT' || status === 'IDEMPOTENT_SKIPPED',
            status,
            data: result
        }, { status: httpStatus });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
