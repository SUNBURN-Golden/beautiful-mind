import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { resolveAirdropTier } from '@/lib/server/tokenomics-core';
import { claimSoulAirdrop } from '@/lib/server/soul-ledger';
import { z } from 'zod';

const AirdropClaimSchema = z.object({
    idempotency_key: z.string().trim().min(1).max(128).optional(),
});

type ClaimAirdropRpcResult = {
    status?: string;
    claim_no?: number;
    cohort?: string;
    amount?: number;
    ledger_id?: string | null;
};

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const rawBody = await req.json().catch(() => ({}));
        const parsed = AirdropClaimSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'invalid idempotency_key' }, { status: 400 });
        }

        const admin = getServiceRoleClient();
        let result: ClaimAirdropRpcResult;
        try {
            result = await claimSoulAirdrop(admin, {
                userId: user.id,
                idempotencyKey: parsed.data.idempotency_key ?? null,
            }) as ClaimAirdropRpcResult;
        } catch (rpcError: unknown) {
            const message = rpcError instanceof Error ? rpcError.message : 'claim_soul_airdrop failed';
            return NextResponse.json({ error: 'AIRDROP_CLAIM_FAILED', message }, { status: 500 });
        }
        const status = typeof result.status === 'string' ? result.status : 'UNKNOWN';
        const claimNo = typeof result.claim_no === 'number' ? result.claim_no : null;
        const fallbackTier = claimNo ? resolveAirdropTier(claimNo) : null;
        const cohort = typeof result.cohort === 'string' ? result.cohort : (fallbackTier?.cohort ?? null);
        const amount = typeof result.amount === 'number' ? result.amount : (fallbackTier?.amount ?? null);
        const ledgerId = typeof result.ledger_id === 'string' ? result.ledger_id : null;

        return NextResponse.json({
            success: status === 'CLAIMED' || status === 'ALREADY_CLAIMED' || status === 'IDEMPOTENT_SKIPPED',
            status,
            claim_no: claimNo,
            cohort,
            amount,
            ledger_id: ledgerId,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
