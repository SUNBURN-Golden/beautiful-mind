import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    const { data, error } = await admin
        .from('user_wallet_balance_audit')
        .select('user_id,ledger_sum,wallet_balance,diff')
        .neq('diff', 0)
        .order('diff', { ascending: false })
        .limit(200);

    if (error) {
        console.error('user_wallet_balance_audit query failed:', error);
        process.exit(1);
    }

    const mismatches = data || [];
    console.log(`wallet consistency mismatches: ${mismatches.length}`);
    if (mismatches.length > 0) {
        console.table(mismatches);
        process.exit(2);
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
