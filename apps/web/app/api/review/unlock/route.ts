import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authErr || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { session_id } = await request.json();
        if (!session_id) {
            return NextResponse.json({ error: 'session_id required' }, { status: 400 });
        }

        // Must be the target_id of the session
        const { data: session, error: sessionErr } = await supabase
            .from('review_sessions')
            .select('id, target_id, stage, reveal_at, view_fee')
            .eq('id', session_id)
            .single();

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

        const viewer_id = user.id;

        // 1) Charge view fee (SOUL)
        const { error: ledgerErr } = await supabase.from('token_ledger').insert({
            user_id: viewer_id,
            currency: 'SOUL',
            amount: -session.view_fee,
            type: 'VIEW_FEE_BURN',
            related_id: session_id,
            idempotency_key: `UNLOCK_FEE:${session_id}:${viewer_id}`,
            description: 'Fee burn for unlocking review signature'
        });

        if (ledgerErr && ledgerErr.code !== '23505') {
            throw ledgerErr;
        }

        // 2) Insert review_unlocks row
        const { error: unlockErr } = await supabase.from('review_unlocks').insert({
            session_id,
            viewer_id,
            idempotency_key: `UNLOCK:${session_id}:${viewer_id}`
        });

        if (unlockErr && unlockErr.code !== '23505') {
            throw unlockErr;
        }

        return NextResponse.json({ unlocked: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
