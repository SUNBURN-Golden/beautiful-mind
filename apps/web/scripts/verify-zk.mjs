import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Manually trigger serverless endpoints essentially by just running the core logic here
    console.log("Fetching Receipts...");
    const { data: receipts } = await supabase.from('event_receipts').select('*').limit(2);
    console.log("Found receipts:", receipts?.length || 0);
    
    // We already invoked the APIs multiple times. Let's just check if ANY commitments exist from our previous Next.js runs
    const { data: commits } = await supabase.from('zk_commitments').select('*').limit(3);
    console.log(`\nFound ${commits?.length || 0} ZK Commitments.`);
    if (commits?.length > 0) {
        console.log("Sample Commitment:");
        console.log(JSON.stringify(commits[0], null, 2));
    }

    const { data: batches } = await supabase.from('zk_rollup_batches').select('*').limit(1);
    console.log(`\nFound ${batches?.length || 0} ZK Rollup Batches.`);
    if (batches?.length > 0) {
        console.log("Sample Batch Status:", batches[0].status);
        console.log(JSON.stringify(batches[0], null, 2));
    }
}
run();
