import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateHolds() {
    console.log('--- STARTING ESCROW HOLDS SIMULATION ---');

    // Find a reviewed user context
    const { data: users } = await s.from('profiles').select('*').eq('verified', true).limit(2);
    if (!users || users.length < 2) return console.error('Need at least 2 verified users.');

    const reviewer = users[0];
    const target = users[1];
    const rewardAmount = 5; // 5 SOUL
    const reviewId = `REV_SIM_${Date.now()}`;

    console.log(`Reviewer: ${reviewer.id} wrote review for ${target.id}`);

    // 1. Create Hold (PENDING)
    const holdDate = new Date();
    holdDate.setHours(holdDate.getHours() + 48); // 48 hours later

    const { data: hold, error: holdErr } = await s.from('token_holds').insert({
        user_id: reviewer.id,
        amount: rewardAmount,
        reason: 'Review Reward',
        state: 'PENDING',
        release_at: holdDate.toISOString(),
        related_id: null,
        idempotency_key: `HOLD_REWARD:${reviewId}`,
        ai_verdict: 'OK',
        ai_confidence: 0.95,
        ai_flags: []
    }).select().single();

    if (holdErr) {
        console.error('Hold creation failed:', holdErr);
        return;
    }
    console.log(`1) Hold generated (PENDING). Amount: ${hold.amount}`);

    // 2. Settlement (Simulating Cron or Admin approval)
    // We update the hold to RELEASED
    const { error: updErr } = await s.from('token_holds').update({
        state: 'RELEASED',
        updated_at: new Date().toISOString()
    }).eq('id', hold.id);

    if (updErr) {
        console.error('Hold update failed:', updErr);
        return;
    }

    // 3. Ledger Minting from Treasury
    // (1) Spend from treasury via official budget RPC
    const { data: treasurySpendResult, error: treasurySpendError } = await s.rpc('treasury_spend_with_budget', {
        p_vault: 'REWARD',
        p_amount: rewardAmount,
        p_related_id: hold.related_id,
        p_idempotency_key: `TREASURY:REWARD:${hold.id}`,
        p_meta: { hold_id: hold.id, source: 'scripts/simulate-holds' }
    });
    if (treasurySpendError) {
        console.error('treasury_spend_with_budget failed:', treasurySpendError);
        return;
    }
    if (!['SPENT', 'IDEMPOTENT_SKIPPED'].includes(String(treasurySpendResult?.status || ''))) {
        console.error('Unexpected treasury spend status:', treasurySpendResult);
        return;
    }

    // (2) Give to User via internal canonical RPC
    const { data: rewardMintResult, error: rewardMintError } = await s.rpc('append_soul_ledger_internal', {
        p_user_id: reviewer.id,
        p_amount: rewardAmount,
        p_type: 'REWARD_MINT',
        p_related_id: hold.related_id,
        p_idempotency_key: `REWARD:${hold.id}`,
        p_meta: { hold_id: hold.id, source: 'scripts/simulate-holds' }
    });
    if (rewardMintError) {
        console.error('append_soul_ledger_internal(REWARD_MINT) failed:', rewardMintError);
        return;
    }
    if (!['INSERTED', 'IDEMPOTENT_SKIPPED'].includes(String(rewardMintResult?.status || ''))) {
        console.error('Unexpected reward mint status:', rewardMintResult);
        return;
    }

    console.log(`2) 정산 후 REWARD 지급: Treasury (-${rewardAmount}) -> User (+${rewardAmount})`);

    console.log('--- ESCROW HOLDS SIMULATION DONE ---');
}
simulateHolds();
