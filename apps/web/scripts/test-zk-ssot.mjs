import { POST as runSnapshot } from '../app/api/zk/commitments/snapshot/route.ts';
import { POST as runPrepare } from '../app/api/zk/rollup/prepare/route.ts';

async function run() {
    process.env.CRON_SECRET = "super_secret_cron_key_12345";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";

    const mockReq = { headers: { get: (k) => k === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null } };
    
    console.log("-> Running Snapshot API");
    const snapRes = await runSnapshot(mockReq);
    console.log(await snapRes.json());
    
    console.log("\n-> Running Prepare API");
    const prepRes = await runPrepare(mockReq);
    console.log(await prepRes.json());
}
run();
