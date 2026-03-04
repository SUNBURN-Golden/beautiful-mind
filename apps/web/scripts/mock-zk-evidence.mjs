import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");

async function run() {
    console.log("-> Rebuilding Cache...");
    await supabase.rpc('apply_patch', { sql_query: "NOTIFY pgrst, 'reload schema';" });

    console.log("-> Fetching Registry...");
    const { data: registry, error: regErr } = await supabase.from('zk_event_registry').select('*').eq('enabled', true);
    if (regErr) { console.error(regErr); return; }
    if (!registry) { console.log("No registry found!"); return; }

    const registryMap = new Map();
    registry.forEach(r => registryMap.set(r.event_type, r));

    const user_id = crypto.randomUUID();
    const source_receipt_id = crypto.randomUUID();

    console.log("\n-> Generating Mock ZK Event Receipt (Schema=3, PII-Free Meta)...");
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

    const { error: iErr } = await supabase.from('zk_event_receipts').insert([newCommitment]);
    if (iErr) {
        console.error("Insert Error Commitments:", iErr);
    } else {
        console.log("Mock Commitment Inserted (Count 1)");
    }

    // Test Batches
    console.log("\n-> Testing ZK Prepare Process...");
    const { data: commitments } = await supabase.from('zk_event_receipts').select('*').limit(10);
    const concatHashes = commitments.map(c => c.commitment_hash).join('');
    const rootHash = crypto.createHash('sha3-256').update(concatHashes).digest('hex');

    const newBatch = {
        batch_start: commitments[0].occurred_at,
        batch_end: commitments[commitments.length - 1].occurred_at,
        items_count: commitments.length,
        root_hash: `0x${rootHash}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        schema_version: 1,
        status: 'READY'
    };

    const { data: batch, error: bErr } = await supabase.from('zk_rollup_batches').insert(newBatch).select('*').single();
    if (bErr) { console.error("Batch error:", bErr); }
    else { console.log("Created Batch ID:", batch.id); }

    console.log("\n====== PAYLOAD FOR WALKTHROUGH EVIDENCE ======");
    console.log("(1) EVENT REGISTRY ALLOWLIST MAP:", Array.from(registryMap.keys()));
    console.log("\n(2) ZK_EVENT_RECEIPTS - PUBLIC INPUTS:");
    console.log(JSON.stringify(newCommitment.public_inputs, null, 2));
    if (batch) {
        console.log("\n(3) ZK_ROLLUP_BATCHES - READY STATE:");
        console.log(JSON.stringify(batch, null, 2));
    }
}
run();
