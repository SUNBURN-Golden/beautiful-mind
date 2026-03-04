import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
async function run() {
    await supabase.rpc('apply_patch', { sql_query: 'NOTIFY pgrst, \'reload schema\';' });
}
run();
