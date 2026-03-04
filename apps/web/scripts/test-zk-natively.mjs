import { POST as runSnapshot } from '../app/api/zk/commitments/snapshot/route.ts';
import { POST as runPrepare } from '../app/api/zk/rollup/prepare/route.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

async function testZkNatively() {
    process.env.CRON_SECRET = process.env.CRON_SECRET || 'super_secret_cron_key_12345';
    
    // Mock Next.js Request object
    const mockReq = {
        headers: {
            get: (key) => {
                if(key === 'authorization') return `Bearer ${process.env.CRON_SECRET}`;
                return null;
            }
        }
    };

    console.log("1. Running Snapshot Controller Natively...");
    const snapRes = await runSnapshot(mockReq);
    const snapData = await snapRes.json();
    console.log("Status:", snapRes.status)
    console.log(JSON.stringify(snapData, null, 2));

    console.log("\n2. Running Prepare Controller Natively...");
    const prepRes = await runPrepare(mockReq);
    const prepData = await prepRes.json();
    console.log("Status:", prepRes.status);
    console.log(JSON.stringify(prepData, null, 2));
}

testZkNatively();
