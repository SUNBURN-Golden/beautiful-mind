import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSession } from '@/lib/server/admin-auth';

const ProposalDecisionSchema = z.object({
    proposal_id: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT', 'ROLL_OUT_STAGED']),
    reviewer_note: z.string().trim().max(1000).optional().default(''),
});

export async function POST(req: Request) {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const parsed = ProposalDecisionSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'invalid payload' },
                { status: 400 },
            );
        }

        const { data: proposal, error: proposalError } = await auth.admin
            .from('policy_change_proposals')
            .select('id,target_rule,proposed_value,status,rationale_json')
            .eq('id', parsed.data.proposal_id)
            .maybeSingle();

        if (proposalError || !proposal) {
            return NextResponse.json(
                { error: 'PROPOSAL_NOT_FOUND', message: proposalError?.message || 'proposal not found' },
                { status: 404 },
            );
        }

        const nowIso = new Date().toISOString();

        if (parsed.data.action === 'REJECT') {
            await auth.admin
                .from('policy_change_proposals')
                .update({
                    status: 'REJECTED',
                    approved_at: null,
                    activated_at: null,
                    approved_by: auth.actorUserId,
                    rationale_json: {
                        ...(proposal.rationale_json || {}),
                        reviewer_note: parsed.data.reviewer_note || null,
                        rejected_at: nowIso,
                    },
                })
                .eq('id', proposal.id);

            return NextResponse.json({ success: true, status: 'REJECTED' });
        }

        if (parsed.data.action === 'APPROVE') {
            await auth.admin
                .from('policy_change_proposals')
                .update({
                    status: 'APPROVED',
                    approved_at: nowIso,
                    approved_by: auth.actorUserId,
                    rationale_json: {
                        ...(proposal.rationale_json || {}),
                        reviewer_note: parsed.data.reviewer_note || null,
                        approved_at: nowIso,
                    },
                })
                .eq('id', proposal.id);

            return NextResponse.json({ success: true, status: 'APPROVED' });
        }

        const proposedValue = (proposal.proposed_value || {}) as Record<string, unknown>;

        if (proposal.target_rule.startsWith('admission.')) {
            await auth.admin
                .from('policy_rules')
                .upsert({
                    rule_key: proposal.target_rule,
                    description: 'Auto-generated staged rollout from policy proposal',
                    rule_value_json: proposedValue,
                    rollout_stage: 'STAGED',
                    is_active: true,
                }, { onConflict: 'rule_key' });
        }

        await auth.admin
            .from('policy_change_proposals')
            .update({
                status: 'ROLLED_OUT',
                approved_at: proposal.status === 'APPROVED' ? nowIso : null,
                activated_at: nowIso,
                approved_by: auth.actorUserId,
                rationale_json: {
                    ...(proposal.rationale_json || {}),
                    reviewer_note: parsed.data.reviewer_note || null,
                    rollout_mode: 'STAGED',
                    rolled_out_at: nowIso,
                },
            })
            .eq('id', proposal.id);

        return NextResponse.json({ success: true, status: 'ROLLED_OUT' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
