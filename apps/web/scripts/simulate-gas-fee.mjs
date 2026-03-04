import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateGasFee() {
    console.log('--- STARTING GAS FEE SIMULATION ---');

    // Find verified users
    const { data: users, error: userErr } = await s.from('profiles').select('*').eq('verified', true).limit(2);

    if (userErr || !users || users.length < 2) {
        console.error('Not enough verified users found.');
        return;
    }

    const userA = users[0];
    const userB = users[1];

    console.log(`Matching ${userA.id} <-> ${userB.id}`);

    const baseFee = 4; // 4 SOUL BURN
    const tipFee = 1;  // 1 SOUL TIP to Treasury
    const totalFee = baseFee + tipFee;

    // 1. Check User A Wallet
    const { data: walletA, error: wErr } = await s.from('user_wallets').select('*').eq('user_id', userA.id).single();
    if (wErr || !walletA || walletA.balance < totalFee) {
        console.error('Insufficient funds for user A.');
        return;
    }

    const requestId = `MATCH_REQ_${Date.now()}`;

    console.log(`User A Balance before: ${walletA.balance}`);

    // 2. Insert Base Fee Burn
    await s.from('token_ledger').insert({
        user_id: userA.id,
        amount: -baseFee,
        type: 'GAS_FEE_BURN',
        idempotency_key: `GAS:BURN:${requestId}`,
        meta: { target_id: userB.id }
    });

    // 3. Insert Tip Fee
    await s.from('token_ledger').insert({
        user_id: userA.id,
        amount: -tipFee,
        type: 'GAS_FEE_TIP',
        idempotency_key: `GAS:TIP:${requestId}`,
        meta: { target_id: userB.id }
    });

    // 4. Insert Treasury Tip
    await s.from('token_ledger').insert({
        user_id: null,
        amount: tipFee,
        type: 'TREASURY_GRANT',
        idempotency_key: `TREASURY:TIP:${requestId}`,
        meta: { source_id: userA.id }
    });

    console.log(`3) 매칭 요청 시 GAS_FEE_BURN/GAS_FEE_TIP 차감 완료`);

    // 5. Verify balances
    const { data: walletAfter } = await s.from('user_wallets').select('*').eq('user_id', userA.id).single();
    console.log(`User A Balance after: ${walletAfter.balance} (Expected: ${walletA.balance - totalFee})`);

    const { data: tWallet } = await s.from('treasury_wallet').select('*').eq('id', 1).single();
    console.log(`Treasury tip 유입 ledger 기록 완료. Balance: ${tWallet.balance}`);

    console.log('--- GAS FEE SIMULATION DONE ---');
}
simulateGasFee();
