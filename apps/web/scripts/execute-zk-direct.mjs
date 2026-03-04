import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");

async function runDirectly() {
    console.log("-> 1. ZK Snapshot Direct Invocation");
    const { data: receipts } = await supabase.from('event_receipts').select('*').limit(2);
    
    if (!receipts || receipts.length === 0) {
        console.log("No receipts!"); return;
    }

    const newCommitments = [];
    for (const receipt of receipts) {
        const userIdKeccak = crypto.createHash('sha3-256').update(receipt.source_id).digest('hex');
        const public_inputs = {
            user_id_hash: `0x${userIdKeccak}`,
            source_table: receipt.source_table,
            timestamp_bucket: new Date(receipt.occurred_at).getTime(),
            action: JSON.parse(receipt.canonical_text).action,
            merkle_leaf: receipt.payload_hash_keccak
        };

        const commitmentHash = crypto.createHash('sha3-256').update(JSON.stringify(public_inputs)).digest('hex');

        newCommitments.push({
            source_receipt_id: receipt.id,
            commitment_scheme: 'POSEIDON_V1_MOCK',
            commitment_hash: `0x${commitmentHash}`,
            public_inputs: public_inputs,
            schema_version: 1
        });
    }

    const { error: iErr } = await supabase.from('zk_commitments').insert(newCommitments);
    if(iErr) console.error(iErr);
    console.log("Inserted Commitments:", newCommitments.length);

    console.log("\n-> 2. ZK Prepare Direct Invocation");
    const { data: commitments } = await supabase.from('zk_commitments').select('*').limit(10);
    const concatHashes = commitments.map(c => c.commitment_hash).join('');
    const rootHash = crypto.createHash('sha3-256').update(concatHashes).digest('hex');

    const newBatch = {
        batch_start: commitments[commitments.length - 1].created_at,
        batch_end: commitments[0].created_at,
        items_count: commitments.length,
        root_hash: `0x${rootHash}`,
        commitment_scheme: 'POSEIDON_V1_MOCK',
        schema_version: 1,
        status: 'READY'
    };

    const { data: batch, error: bErr } = await supabase.from('zk_rollup_batches').insert(newBatch).select('*').single();
    if(bErr) console.error(bErr);
    
    console.log("Created Batch:", batch.id, "STATUS:", batch.status);
    
    console.log("\n=== VALIDATION PAYLOADS ===");
    console.log(JSON.stringify(newCommitments[0], null, 2));
    console.log(JSON.stringify(batch, null, 2));
}

runDirectly();
