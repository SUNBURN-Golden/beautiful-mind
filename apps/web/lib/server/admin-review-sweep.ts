import type { SupabaseClient } from '@supabase/supabase-js';
import { appendSoulLedgerInternal } from './soul-ledger';

export async function runAdminReviewSweep(
    admin: SupabaseClient,
    nowIso = new Date().toISOString(),
) {
    let slashesApplied = 0;
    let finalizationsApplied = 0;

    const { data: overdueSessions, error: overdueErr } = await admin
        .from('review_sessions')
        .select('id, reviewer_id, risk_flags')
        .lte('due_at', nowIso)
        .not('stage', 'in', '("SIGNED","FINALIZED","ABORTED")');

    if (overdueErr) throw overdueErr;

    for (const session of overdueSessions || []) {
        const ledgerResult = await appendSoulLedgerInternal(admin, {
            userId: session.reviewer_id,
            amount: -5,
            type: 'SLASHING_BURN',
            relatedId: session.id,
            idempotencyKey: `SLASH_NO_REVIEW:${session.id}`,
            meta: { description: 'Slashing for failure to submit review by due date' },
        });

        if (['INSERTED', 'IDEMPOTENT_SKIPPED'].includes(String(ledgerResult.status || ''))) {
            const newFlags = session.risk_flags ? [...session.risk_flags, 'NO_REVIEW'] : ['NO_REVIEW'];
            await admin
                .from('review_sessions')
                .update({
                    stage: 'ABORTED',
                    risk_flags: [...new Set(newFlags)],
                })
                .eq('id', session.id);

            slashesApplied++;
        }
    }

    const { data: signSessions, error: signErr } = await admin
        .from('review_sessions')
        .select('id, reviewer_id')
        .eq('stage', 'SIGNED')
        .is('finalized_at', null)
        .lte('reveal_at', nowIso);

    if (signErr) throw signErr;

    for (const session of signSessions || []) {
        const { error: holdErr } = await admin
            .from('token_holds')
            .insert({
                user_id: session.reviewer_id,
                amount: 5,
                reason: 'Co-Authored Review Completion',
                state: 'PENDING',
                idempotency_key: `HOLD_REVIEW:${session.id}`,
                related_id: session.id,
            });

        if (!holdErr || holdErr.code === '23505') {
            await admin
                .from('review_sessions')
                .update({
                    stage: 'FINALIZED',
                    finalized_at: nowIso,
                })
                .eq('id', session.id);

            finalizationsApplied++;
        }
    }

    return { slashesApplied, finalizationsApplied };
}
