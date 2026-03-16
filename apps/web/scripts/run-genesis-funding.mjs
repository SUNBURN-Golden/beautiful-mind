import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runGenesisFunding() {
    console.log('--- STARTING GENESIS FUNDING ---');

    const GENESIS_AMOUNT = 10000000; // 10,000,000 SOUL

    // 1. Insert treasury grant via internal canonical RPC
    const { data: ledgerResult, error: ledgerErr } = await s.rpc('append_soul_ledger_internal', {
        p_user_id: null,
        p_amount: GENESIS_AMOUNT,
        p_type: 'TREASURY_GRANT',
        p_related_id: null,
        p_idempotency_key: 'TREASURY:GENESIS',
        p_meta: { note: 'initial funding', version: 'p3-step0', source: 'scripts/run-genesis-funding' }
    });

    if (ledgerErr) {
        console.error('append_soul_ledger_internal failed:', ledgerErr);
        return;
    }

    if (ledgerResult?.status === 'IDEMPOTENT_SKIPPED') {
        console.log('Genesis funding already applied (Idempotent).');
    } else if (ledgerResult?.status === 'INSERTED') {
        console.log('1) Treasury Genesis funding ledger 기록 완료. ledger_id:', ledgerResult.ledger_id);
    } else {
        console.error('Unexpected ledger mutation status:', ledgerResult);
        return;
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
