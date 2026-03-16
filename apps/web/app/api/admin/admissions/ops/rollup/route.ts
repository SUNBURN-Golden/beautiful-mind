import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSessionOrCron } from '@/lib/server/admin-auth';
import {
    generatePolicyChangeProposals,
    refreshAdmissionOpsForDay,
} from '@/lib/server/admission-ops';

const RollupSchema = z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    generate_proposals: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
    try {
        const auth = await assertAdminSessionOrCron(req);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const parsed = RollupSchema.safeParse(await req.json().catch(() => ({})));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'invalid payload' },
                { status: 400 },
            );
        }

        const day = parsed.data.day;
        const rollup = await refreshAdmissionOpsForDay(auth.admin, day);

        let proposalsCreated = 0;
        if (parsed.data.generate_proposals) {
            const generated = await generatePolicyChangeProposals(auth.admin, rollup.day);
            proposalsCreated = generated.created;
        }

        return NextResponse.json({
            success: true,
            day: rollup.day,
            metrics_refreshed: rollup.metrics_refreshed,
            anomalies_detected: rollup.anomalies_detected,
            proposals_created: proposalsCreated,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
