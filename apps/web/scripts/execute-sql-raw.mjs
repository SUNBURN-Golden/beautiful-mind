import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
const sql = fs.readFileSync('../../supabase/migrations/20260225000016_zk_ssot_parallel.sql', 'utf8');
async function run() {
    console.log("-> 1. Creating Schema via RPC");
    const { error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if(error) console.error("SQL Error:", error);
    
    console.log("-> 2. Reloading pgrst");
    const { error: rErr } = await supabase.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });
    if(rErr) console.error("Reload Error:", rErr);
    
    console.log("-> 3. Done.");
}
run();
