import { POST as runSnapshot } from '../app/api/zk/commitments/snapshot/route.ts';
import { POST as runPrepare } from '../app/api/zk/rollup/prepare/route.ts';

async function testApi() {
    process.env.CRON_SECRET = "super_secret_cron_key_12345";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";

    const mockReq = {
        headers: { get: (k) => k === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null }
    };

    console.log("-> Running Snapshot POST...");
    const res1 = await runSnapshot(mockReq);
    console.log(await res1.json());

    console.log("-> Running Prepare POST...");
    const res2 = await runPrepare(mockReq);
    console.log(await res2.json());
}
testApi();
