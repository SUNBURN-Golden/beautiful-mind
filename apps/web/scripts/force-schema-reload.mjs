import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    console.log("Forcing schema reload...");
    const { error } = await supabaseAdmin.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });
    if (error) {
        console.log("RPC apply_patch might fail if disabled, trying direct query if possible, else we just wait... Error:", error);
    } else {
        console.log("Reload sent.");
    }
}
run();
