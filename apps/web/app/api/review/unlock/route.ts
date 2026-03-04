import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type UnlockBody = {
    session_id?: unknown;
};

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // no-op for route handler auth reads
                },
            },
        });

        const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({})) as UnlockBody;
        const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
        if (!sessionId) {
            return NextResponse.json({ error: 'session_id required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Must be the target_id of the session
        const { data: session, error: sessionErr } = await supabaseAdmin
            .from('review_sessions')
            .select('id, target_id, stage, reveal_at, view_fee')
            .eq('id', sessionId)
            .maybeSingle();

        if (sessionErr || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.target_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden. Only target can unlock.' }, { status: 403 });
        }

        // Must satisfy NOW() >= reveal_at
        if (!session.reveal_at || new Date() < new Date(session.reveal_at)) {
            return NextResponse.json({ error: 'Reveal date has not yet passed.' }, { status: 403 });
        }

        // Must satisfy session.stage IN ('SIGNED','FINALIZED')
        if (session.stage !== 'SIGNED' && session.stage !== 'FINALIZED') {
            return NextResponse.json({ error: 'Session is not yet signed or finalized.' }, { status: 403 });
        }

        const viewerId = user.id;
        const viewFeeRaw = typeof session.view_fee === 'number'
            ? session.view_fee
            : Number(session.view_fee);
        const viewFee = Number.isFinite(viewFeeRaw) ? Math.max(0, Math.trunc(viewFeeRaw)) : 0;

        // 1) Charge view fee (SOUL) - token_ledger is append-only and schema-locked
        if (viewFee > 0) {
            const { error: ledgerErr } = await supabaseAdmin.from('token_ledger').insert({
                user_id: viewerId,
                amount: -viewFee,
                type: 'GAS_FEE_BURN',
                related_id: sessionId,
                idempotency_key: `UNLOCK_FEE:${sessionId}:${viewerId}`,
                meta: {
                    scope: 'REVIEW_UNLOCK',
                    reason: 'Fee burn for unlocking review signature',
                },
            });

            if (ledgerErr && ledgerErr.code !== '23505') {
                throw ledgerErr;
            }
        }

        // 2) Insert review_unlocks row
        const { error: unlockErr } = await supabaseAdmin.from('review_unlocks').insert({
            session_id: sessionId,
            viewer_id: viewerId,
            idempotency_key: `UNLOCK:${sessionId}:${viewerId}`,
        });

        if (unlockErr && unlockErr.code !== '23505') {
            throw unlockErr;
        }

        return NextResponse.json({ unlocked: true, fee_burned: viewFee });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
