import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");

async function run() {
    const { data: commits } = await supabase.from('zk_commitments').select('*').limit(1);
    const { data: batches } = await supabase.from('zk_rollup_batches').select('*').limit(1);
    
    console.log("=== DB ZK_COMMITMENTS ===");
    console.log(commits?.length ? JSON.stringify(commits[0], null, 2) : "NONE");

    console.log("\n=== DB ZK_ROLLUP_BATCHES ===");
    console.log(batches?.length ? JSON.stringify(batches[0], null, 2) : "NONE");
}
run();
