import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSession } from '@/lib/server/admin-auth';
import { simulatePolicyProposal } from '@/lib/server/admission-ops';

const SimulateSchema = z.object({
    proposal_id: z.string().uuid(),
    sample_size: z.coerce.number().int().min(50).max(1000).optional().default(300),
});

export async function POST(req: Request) {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const parsed = SimulateSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'invalid payload' },
                { status: 400 },
            );
        }

        const result = await simulatePolicyProposal(
            auth.admin,
            parsed.data.proposal_id,
            parsed.data.sample_size,
        );

        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
