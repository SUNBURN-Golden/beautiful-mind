import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
const sql = fs.readFileSync('../../supabase/migrations/20260225000016_zk_ssot_parallel.sql', 'utf8');
async function run() {
    console.log("Applying SSOT Parallel ZK Schema...");
    const { error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if(error) { console.error("Error creating tables:", error); return; }
    
    console.log("Reloading postgREST Schema Cache...");
    await supabase.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });
    console.log("Success! DB ready for SSOT ZK tests.");
}
run();
