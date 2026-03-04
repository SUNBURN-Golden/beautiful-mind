import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
const sql = fs.readFileSync('../../supabase/migrations/20260225000015_zk_rollup_slots.sql', 'utf8');
async function run() {
    const { error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if(error) { console.error("Error creating tables:", error); return; }
    await supabase.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });
    console.log("Deployed & Reloaded!");
}
run();
