import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser, isFeatureEnabled } from '@/lib/server/trust';
import { z } from 'zod';

const SelfClaimSchema = z.object({
    claim_type: z.string().trim().min(1).max(128),
    claim_payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = SelfClaimSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'claim_type is required' }, { status: 400 });
        }
        const claimType = parsed.data.claim_type;
        const claimPayload = parsed.data.claim_payload;

        if (claimType === 'ADMISSION_SOUL' || claimType === 'SOUL_TRUST') {
            return NextResponse.json(
                {
                    error: 'CORE_ADMISSION_CLAIM_BLOCKED',
                    message: 'Core admission trust credential is only issued by final admission approval.',
                },
                { status: 403 }
            );
        }

        const admin = getServiceRoleClient();

        const collateralRequired = await isFeatureEnabled(admin, 'COLLATERAL_REQUIRED_ON_SIGNUP', false);
        if (collateralRequired) {
            const { data: collateral } = await admin
                .from('collateral_accounts')
                .select('balance')
                .eq('user_id', user.id)
                .maybeSingle();

            const balance = typeof collateral?.balance === 'number' ? collateral.balance : 0;
            if (balance <= 0) {
                return NextResponse.json(
                    { error: 'COLLATERAL_REQUIRED', message: 'Deposit collateral before self-claim issuance.' },
                    { status: 409 }
                );
            }
        }

        const { data: existingClaim } = await admin
            .from('sbt_claims')
            .select('id, status, trust_level, claim_type')
            .eq('user_id', user.id)
            .eq('claim_type', claimType)
            .in('status', ['PENDING', 'ACTIVE', 'FROZEN'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingClaim) {
            return NextResponse.json(
                { error: 'CLAIM_ALREADY_EXISTS', data: existingClaim },
                { status: 409 }
            );
        }

        const { data: inserted, error: insertError } = await admin
            .from('sbt_claims')
            .insert({
                user_id: user.id,
                claim_type: claimType,
                trust_level: 'LOW',
                status: 'ACTIVE',
                issuer: 'SELF',
                claim_payload: claimPayload,
                issued_at: new Date().toISOString()
            })
            .select('id, user_id, claim_type, trust_level, status, issuer, issued_at')
            .single();

        if (insertError || !inserted) {
            return NextResponse.json(
                { error: 'CLAIM_INSERT_FAILED', message: insertError?.message || 'Failed to create claim' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            claim: inserted
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
