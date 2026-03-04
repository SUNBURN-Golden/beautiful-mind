import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateAirdrop() {
    console.log('--- STARTING AIRDROP SIMULATION ---');

    // Pick an unbanned, verified user
    const { data: users, error: userErr } = await s.from('profiles').select('*').eq('verified', true).limit(1);

    if (userErr || !users || users.length === 0) {
        console.error('No verified user found.');
        return;
    }
    const user = users[0];

    console.log('Target User ID:', user.id);

    const idempotencyKey = `AIRDROP:${user.id}`;
    let airdropAmount = 20; // Default
    let claimNo = null;

    // 1. Claim Airdrop Slot (Race Condition Safe)
    const { data: claim, error: claimErr } = await s.from('soul_airdrop_claims').insert({
        user_id: user.id,
        airdrop_amount: 0, // Placeholder
        idempotency_key: idempotencyKey
    }).select().single();

    if (claimErr) {
        if (claimErr.code === '23505') {
            console.log('User already claimed an airdrop.');
            return;
        } else {
            console.error('Claim insert failed:', claimErr);
            return;
        }
    }

    claimNo = claim.claim_no;
    console.log(`Claim No: ${claimNo}`);

    // Determine tier
    let tier = 'BASE';
    if (claimNo <= 100) { airdropAmount = 80; tier = 'TOP100'; }
    else if (claimNo <= 1000) { airdropAmount = 50; tier = 'TOP1000'; }

    // Update claim amount
    await s.from('soul_airdrop_claims').update({ airdrop_amount: airdropAmount }).eq('claim_no', claimNo);

    // 2. Insert into Ledger
    const { data: ledger, error: ledgerErr } = await s.from('token_ledger').insert({
        user_id: user.id,
        amount: airdropAmount,
        type: 'AIRDROP',
        idempotency_key: idempotencyKey,
        meta: { claim_no: claimNo, tier: tier, verified_at: new Date().toISOString() }
    }).select().single();

    if (ledgerErr) {
        console.error('Failed to insert ledger for airdrop:', ledgerErr);
        return;
    }
    console.log(`2) PortOne verified 후 Airdrop 지급 ledger 기록: +${ledger.amount} SOUL (Tier: ${tier})`);

    // 3. Check Wallet
    const { data: wallet, error: walletErr } = await s.from('user_wallets').select('*').eq('user_id', user.id).single();
    if (walletErr) console.error('Wallet fetch error:', walletErr);
    else console.log(`3) user_wallet 반영 완료. Balance: ${wallet.balance} SOUL`);

    console.log('--- AIRDROP SIMULATION DONE ---');
}
simulateAirdrop();
