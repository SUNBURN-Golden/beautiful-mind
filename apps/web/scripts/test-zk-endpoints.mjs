import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

async function testZk() {
    console.log("1. Snapshotting ZK Commitments...");
    const snapRes = await fetch('http://localhost:3000/api/zk/commitments/snapshot', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
    });
    console.log("Snapshot HTTP Status:", snapRes.status);
    const snapData = await snapRes.json();
    console.log(JSON.stringify(snapData, null, 2));

    console.log("\n2. Preparing ZK Rollup Batch...");
    const prepRes = await fetch('http://localhost:3000/api/zk/rollup/prepare', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
    });
    console.log("Prepare HTTP Status:", prepRes.status);
    const prepData = await prepRes.json();
    console.log(JSON.stringify(prepData, null, 2));
}

testZk();
