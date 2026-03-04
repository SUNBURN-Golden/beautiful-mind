import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.config({ path: envPath }).parsed;
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(supabaseUrl, serviceKey);

async function runReplay() {
    console.log('=== GATE A: LEDGER IMMUTABILITY & REPLAY DETERMINISM ===');

    // 1. Fetch all ledger rows ordered by timestamp
    const { data: ledgerRows, error: lErr } = await s.from('token_ledger')
        .select('*')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }); // secondary sort

    if (lErr) {
        console.error('Failed to fetch ledger:', lErr);
        process.exit(1);
    }

    // 2. Fetch current wallet cache
    const { data: wallets, error: wErr } = await s.from('user_wallets').select('*');
    if (wErr) {
        console.error('Failed to fetch wallets:', wErr);
        process.exit(1);
    }

    console.log(`Fetched Ledger Rows: ${ledgerRows.length}`);
    let calculatedBalances = {}; // { userId_currency: balance }

    for (const row of ledgerRows) {
        if (!row.user_id) continue;
        console.log('Row:', row.user_id, row.amount);
        const key = row.user_id;
        if (!calculatedBalances[key]) calculatedBalances[key] = 0;
        calculatedBalances[key] += Number(row.amount);
    }

    let discrepancies = 0;

    for (const wallet of wallets) {
        const key = wallet.user_id;
        const calcBal = calculatedBalances[key] || 0;
        if (Number(wallet.balance) !== calcBal) {
            console.error(`DISCREPANCY DETECTED for User ${wallet.user_id}:`);
            console.error(`  Cached Balance: ${wallet.balance}`);
            console.error(`  Ledger Replay:  ${calcBal}`);
            discrepancies++;
        }
    }

    if (discrepancies > 0) {
        console.error(`\nFAILED: Found ${discrepancies} wallet(s) that do not match the ledger replay.`);
        process.exit(1);
    }

    console.log(`Verified Ledger Rows: ${ledgerRows.length}`);
    console.log(`Verified User Wallets: ${wallets.length}`);
    console.log('Discrepancies: 0');
    console.log('Result: REPLAY DETERMINISM PASS\n');
}

runReplay();
