/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto');

async function run() {
    const URL = "https://fcqsdfpbwqjpvpunrxdh.supabase.co/rest/v1";
    const KEY = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
    const HEADERS = {
        "apikey": KEY,
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };

    // 1. Fetch Registry
    const regRes = await fetch(`${URL}/zk_event_registry?enabled=eq.true`, { headers: HEADERS });
    const registry = await regRes.json();
    const registryMap = new Map();
    registry.forEach(r => registryMap.set(r.event_type, r));

    // 2. Generate Payload
    const user_id = crypto.randomUUID();
    const source_receipt_id = crypto.randomUUID();

    const mockMeta = {
        verification_type: "ID_CARD",
        status: "VERIFIED",
        tier_result: "A",
        band_result: "MILLENNIAL",
        adjudication_reason: "Automated AI Approval"
    };

    const public_inputs = {
        user_id_hash: `0x${crypto.createHash('sha3-256').update(user_id).digest('hex')}`,
        event_type: "VERIFICATIONS_INSERT",
        timestamp_bucket: new Date('2024-04-17T16:00:00Z').getTime(),
        ...mockMeta
    };

    const public_inputs_hash_keccak = crypto.createHash('sha3-256').update(JSON.stringify(public_inputs)).digest('hex');
    const commitInputStr = `SOULBOUND_COMMIT_V0|${public_inputs_hash_keccak}|${registryMap.get("VERIFICATIONS_INSERT").circuit_id}|0`;
    const commitment_hash = crypto.createHash('sha3-256').update(commitInputStr).digest('hex');

    const newCommitment = {
        source_receipt_id: source_receipt_id,
        event_type: "VERIFICATIONS_INSERT",
        circuit_id: registryMap.get("VERIFICATIONS_INSERT").circuit_id,
        public_inputs: public_inputs,
        public_inputs_hash_keccak: `0x${public_inputs_hash_keccak}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        commitment_hash: `0x${commitment_hash}`,
        nullifier_hash: null,
        schema_version: 0,
        occurred_at: new Date().toISOString()
    };

    // 3. POST Insert
    const objRes = await fetch(`${URL}/zk_event_receipts`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(newCommitment)
    });
    const objData = await objRes.json();

    const concatHashStr = objData[0].commitment_hash;
    const rootHash = crypto.createHash('sha3-256').update(concatHashStr).digest('hex');
    const newBatch = {
        batch_start: objData[0].occurred_at,
        batch_end: objData[0].occurred_at,
        items_count: 1,
        root_hash: `0x${rootHash}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        schema_version: 1,
        status: 'READY'
    };

    const batchRes = await fetch(`${URL}/zk_rollup_batches`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(newBatch)
    });
    const batchData = await batchRes.json();

    console.log("====== PAYLOAD FOR WALKTHROUGH EVIDENCE ======");
    console.log("(1) EVENT REGISTRY ALLOWLIST MAP:", Array.from(registryMap.keys()));
    console.log("\n(2) ZK_EVENT_RECEIPTS - PUBLIC INPUTS:");
    console.log(JSON.stringify(objData[0].public_inputs, null, 2));
    console.log("\n(3) ZK_ROLLUP_BATCHES - READY STATE:");
    console.log(JSON.stringify(batchData[0], null, 2));
}

run();
