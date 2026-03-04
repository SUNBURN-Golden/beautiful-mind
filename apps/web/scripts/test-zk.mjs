import { POST as runSnapshot } from '../app/api/zk/commitments/snapshot/route.ts';
import { POST as runPrepare } from '../app/api/zk/rollup/prepare/route.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

async function run() {
    console.log("=== Phase 4.2 ZK Endpoint Test Natively ===");
    
    const mockReq = {
        headers: {
            get: (key) => {
                if(key === 'authorization') return `Bearer ${process.env.CRON_SECRET}`;
                return null;
            }
        }
    };

    console.log("1. Snapshotting...");
    const snapRes = await runSnapshot(mockReq);
    console.log("Status:", snapRes.status);
    const snapData = await snapRes.json();
    console.log(JSON.stringify(snapData, null, 2));

    console.log("\n2. Preparing...");
    const prepRes = await runPrepare(mockReq);
    console.log("Status:", prepRes.status);
    const prepData = await prepRes.json();
    console.log(JSON.stringify(prepData, null, 2));
}

run();
