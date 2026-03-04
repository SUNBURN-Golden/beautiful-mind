import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '../../.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync('../../supabase/migrations/20260225000015_zk_rollup_slots.sql', 'utf8');
async function run() {
    console.log("Applying ZK Rollup schema...");
    const { error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if (error) {
        console.error("Migration Error:", error.message);
        process.exit(1);
    }
    console.log("Success.");
}
run();
