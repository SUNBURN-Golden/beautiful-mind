import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
const sql = fs.readFileSync('../../supabase/migrations/20260225000017_zk_defuse_landmines.sql', 'utf8');
async function run() {
    console.log("-> 1. Applying ZK Defusal Migration...");
    const { error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if(error) { console.error("Error:", error); return; }
    
    console.log("-> 2. Reloading pgrst Cache...");
    await supabase.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });
    console.log("-> DONE. Triggers Dropped & RLS Locked to service_role.");
}
run();
