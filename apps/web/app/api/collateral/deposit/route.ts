import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { z } from 'zod';

const DepositSchema = z.object({
    amount: z.coerce.number().int().positive().max(1_000_000_000),
    idempotency_key: z.string().trim().min(1).max(128).optional(),
});

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = DepositSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'amount must be a positive integer' }, { status: 400 });
        }
        const amount = parsed.data.amount;

        const idempotencyKey =
            parsed.data.idempotency_key
                ? parsed.data.idempotency_key
                : `COLLATERAL_DEPOSIT:${user.id}:${Date.now()}`;

        const admin = getServiceRoleClient();
        const { data, error } = await admin.rpc('apply_collateral_deposit', {
            p_user_id: user.id,
            p_amount: amount,
            p_idempotency_key: idempotencyKey,
            p_meta: {
                source: 'api/collateral/deposit',
                actor: 'USER'
            }
        });

        if (error) {
            return NextResponse.json(
                { error: 'COLLATERAL_DEPOSIT_FAILED', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            result: data
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
