import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSession } from '@/lib/server/admin-auth';
import { generatePolicyChangeProposals, refreshAdmissionOpsForDay } from '@/lib/server/admission-ops';

const GenerateSchema = z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    force_refresh: z.boolean().optional().default(true),
});

export async function GET() {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const [proposals, metrics, anomalies] = await Promise.all([
            auth.admin
                .from('policy_change_proposals')
                .select('id,proposal_type,target_rule,current_value,proposed_value,rationale_json,based_on_metrics_json,simulation_result_json,status,created_at,approved_at,activated_at')
                .order('created_at', { ascending: false })
                .limit(200),
            auth.admin
                .from('admission_ops_metrics_daily')
                .select('*')
                .order('day', { ascending: false })
                .limit(30),
            auth.admin
                .from('admission_ops_anomalies')
                .select('*')
                .order('detected_at', { ascending: false })
                .limit(100),
        ]);

        return NextResponse.json({
            success: true,
            proposals: proposals.data || [],
            metrics_daily: metrics.data || [],
            anomalies: anomalies.data || [],
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const parsed = GenerateSchema.safeParse(await req.json().catch(() => ({})));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'invalid payload' },
                { status: 400 },
            );
        }

        const day = parsed.data.day;
        if (parsed.data.force_refresh) {
            await refreshAdmissionOpsForDay(auth.admin, day);
        }

        const generated = await generatePolicyChangeProposals(auth.admin, day);
        return NextResponse.json({ success: true, day: generated.day, created: generated.created });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
