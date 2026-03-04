import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runGenesisFunding() {
    console.log('--- STARTING GENESIS FUNDING ---');

    const GENESIS_AMOUNT = 10000000; // 10,000,000 MIND

    // 1. Insert into token_ledger as Treasury (user_id = null)
    const { data: ledger, error: ledgerErr } = await s.from('token_ledger').insert({
        user_id: null,
        amount: GENESIS_AMOUNT,
        type: 'TREASURY_GRANT',
        idempotency_key: 'TREASURY:GENESIS',
        meta: { note: 'initial funding', version: 'p3-step0' }
    }).select().single();

    if (ledgerErr) {
        if (ledgerErr.code === '23505') {
            console.log('Genesis funding already applied (Idempotent).');
        } else {
            console.error('Ledger error:', ledgerErr);
            return;
        }
    } else {
        console.log('1) Treasury Genesis funding ledger 기록 완료. Amount:', ledger.amount);
    }

    // 2. Check treasury_wallet
    const { data: treasury, error: treasuryErr } = await s.from('treasury_wallet').select('*').eq('id', 1).single();
    if (treasuryErr) console.error('Treasury wallet error:', treasuryErr);
    else console.log('2) treasury_wallet 반영 완료. Balance:', treasury.balance);

    // 3. Check Audit View
    const { data: audit, error: auditErr } = await s.from('treasury_wallet_audit').select('*').single();
    if (auditErr) console.error('Audit view error:', auditErr);
    else console.log('3) treasury_wallet_audit 확인:', audit);

    console.log('--- GENESIS FUNDING DONE ---');
}
runGenesisFunding();
