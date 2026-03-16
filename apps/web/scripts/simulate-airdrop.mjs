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

    const idempotencyKey = `SIM_AIRDROP:${user.id}:${Date.now()}`;
    const { data: claimResult, error: claimErr } = await s.rpc('claim_soul_airdrop', {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
    });

    if (claimErr) {
        console.error('claim_soul_airdrop RPC failed:', claimErr);
        return;
    }

    const status = String(claimResult?.status || 'UNKNOWN');
    if (!['CLAIMED', 'ALREADY_CLAIMED', 'IDEMPOTENT_SKIPPED'].includes(status)) {
        console.error('Unexpected claim status:', claimResult);
        return;
    }

    console.log(`1) claim_soul_airdrop status=${status} claim_no=${claimResult?.claim_no ?? 'n/a'} amount=${claimResult?.amount ?? 'n/a'} cohort=${claimResult?.cohort ?? 'n/a'}`);

    // 2. Check Wallet projection
    const { data: wallet, error: walletErr } = await s.from('user_wallets').select('*').eq('user_id', user.id).single();
    if (walletErr) console.error('Wallet fetch error:', walletErr);
    else console.log(`2) user_wallet 반영 완료. Balance: ${wallet.balance} SOUL`);

    console.log('--- AIRDROP SIMULATION DONE ---');
}
simulateAirdrop();
