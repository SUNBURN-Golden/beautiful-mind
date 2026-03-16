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
    const apply = process.env.APPLY === 'true';
    const userId = process.env.USER_ID || null;

    const { data, error } = await admin.rpc('reconcile_user_wallet_balance', {
        p_user_id: userId,
        p_apply: apply,
    });

    if (error) {
        console.error('reconcile_user_wallet_balance failed:', error);
        process.exit(1);
    }

    console.log('reconcile_user_wallet_balance result:');
    console.log(JSON.stringify(data, null, 2));
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
