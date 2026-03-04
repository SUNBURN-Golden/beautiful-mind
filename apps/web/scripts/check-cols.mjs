import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");
async function run() {
    const { data } = await supabase.rpc('apply_patch', { sql_query: "SELECT json_agg(column_name) FROM information_schema.columns WHERE table_name = 'event_receipts'" });
    console.log(data);
}
run();
