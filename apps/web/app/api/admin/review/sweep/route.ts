import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-cron-secret');
        if (authHeader !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        let slashesApplied = 0;
        let finalizationsApplied = 0;

        // A) NO-REVIEW SLASH
        // Find sessions where NOW() >= due_at AND stage NOT IN ('SIGNED','FINALIZED','ABORTED')
        const { data: overdueSessions, error: overdueErr } = await supabase
            .from('review_sessions')
            .select('id, reviewer_id, risk_flags')
            .lte('due_at', new Date().toISOString())
            .not('stage', 'in', '("SIGNED","FINALIZED","ABORTED")');

        if (overdueErr) throw overdueErr;

        if (overdueSessions && overdueSessions.length > 0) {
            for (const session of overdueSessions) {
                // 1. Insert Ledger Slash
                const { error: ledgerErr } = await supabase.from('token_ledger').insert({
                    user_id: session.reviewer_id,
                    amount: -5,
                    type: 'SLASHING_BURN',
                    related_id: session.id,
                    idempotency_key: `SLASH_NO_REVIEW:${session.id}`,
                    meta: { description: 'Slashing for failure to submit review by due date' }
                });

                if (!ledgerErr || ledgerErr.code === '23505') {
                    // 2. Update session stage and risk flags
                    const newFlags = session.risk_flags ? [...session.risk_flags, 'NO_REVIEW'] : ['NO_REVIEW'];
                    await supabase.from('review_sessions')
                        .update({
                            stage: 'ABORTED',
                            risk_flags: [...new Set(newFlags)]
                        })
                        .eq('id', session.id);

                    slashesApplied++;
                }
            }
        }

        // B) FINALIZE SIGNED
        // Find sessions where stage='SIGNED' AND finalized_at IS NULL AND NOW() >= reveal_at
        const { data: signSessions, error: signErr } = await supabase
            .from('review_sessions')
            .select('id, reviewer_id')
            .eq('stage', 'SIGNED')
            .is('finalized_at', null)
            .lte('reveal_at', new Date().toISOString());

        if (signErr) throw signErr;

        if (signSessions && signSessions.length > 0) {
            for (const session of signSessions) {
                // Create Reward Hold
                const { error: holdErr } = await supabase.from('token_holds').insert({
                    user_id: session.reviewer_id,
                    amount: 5,
                    reason: 'Co-Authored Review Completion',
                    state: 'PENDING',
                    idempotency_key: `HOLD_REVIEW:${session.id}`,
                    related_id: session.id
                });

                if (!holdErr || holdErr.code === '23505') {
                    // Set finalized
                    await supabase.from('review_sessions')
                        .update({
                            stage: 'FINALIZED',
                            finalized_at: new Date().toISOString()
                        })
                        .eq('id', session.id);

                    finalizationsApplied++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            slashesApplied,
            finalizationsApplied
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
