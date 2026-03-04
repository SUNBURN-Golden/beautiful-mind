import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateHolds() {
    console.log('--- STARTING ESCROW HOLDS SIMULATION ---');

    // Find a reviewed user context
    const { data: users, error: userErr } = await s.from('profiles').select('*').eq('verified', true).limit(2);
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
    // (1) Take from Treasury
    await s.from('token_ledger').insert({
        user_id: null,
        amount: -rewardAmount,
        type: 'TREASURY_SPEND',
        idempotency_key: `TREASURY:REWARD:${hold.id}`,
        meta: { hold_id: hold.id }
    });

    // (2) Give to User
    await s.from('token_ledger').insert({
        user_id: reviewer.id,
        amount: rewardAmount,
        type: 'REWARD_MINT',
        idempotency_key: `REWARD:${hold.id}`,
        meta: { hold_id: hold.id }
    });

    console.log(`2) 정산 후 REWARD 지급: Treasury (-${rewardAmount}) -> User (+${rewardAmount})`);

    console.log('--- ESCROW HOLDS SIMULATION DONE ---');
}
simulateHolds();
