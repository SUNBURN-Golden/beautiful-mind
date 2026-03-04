const { Client } = require('pg');
const crypto = require('crypto');

async function run() {
    const client = new Client({ connectionString: "postgresql://postgres.clntuqqwckrwhqowpuek:9o6h3yUe9uL7L8p%25@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" });
    await client.connect();

    // Check Registry
    const regRes = await client.query("SELECT * FROM public.zk_event_registry WHERE enabled = true");
    const registry = regRes.rows;
    const registryMap = new Map();
    registry.forEach(r => registryMap.set(r.event_type, r));

    const user_id = crypto.randomUUID();
    const source_receipt_id = crypto.randomUUID();

    const mockMeta = {
        verification_type: "ID_CARD",
        status: "VERIFIED",
        tier_result: "A",
        band_result: "MILLENNIAL",
        adjudication_reason: "Automated AI Approval"
    };

    // Stable stringify mock (keys ordering)
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
        public_inputs: JSON.stringify(public_inputs), // PG driver jsonb injection handling
        public_inputs_hash_keccak: `0x${public_inputs_hash_keccak}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        commitment_hash: `0x${commitment_hash}`,
        nullifier_hash: null,
        schema_version: 0,
        occurred_at: new Date().toISOString()
    };

    const insertQ = `
        INSERT INTO public.zk_event_receipts (source_receipt_id, event_type, circuit_id, public_inputs, public_inputs_hash_keccak, commitment_scheme, commitment_hash, nullifier_hash, schema_version, occurred_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const inserted = await client.query(insertQ, [
        newCommitment.source_receipt_id, newCommitment.event_type, newCommitment.circuit_id, newCommitment.public_inputs, newCommitment.public_inputs_hash_keccak, newCommitment.commitment_scheme, newCommitment.commitment_hash, newCommitment.nullifier_hash, newCommitment.schema_version, newCommitment.occurred_at
    ]);

    console.log("-> Generating Batch...");
    const commitsRes = await client.query("SELECT * FROM public.zk_event_receipts LIMIT 10");
    const commitments = commitsRes.rows;

    const concatHashes = commitments.map(c => c.commitment_hash).join('');
    const rootHash = crypto.createHash('sha3-256').update(concatHashes).digest('hex');

    const batchQ = `
        INSERT INTO public.zk_rollup_batches (batch_start, batch_end, items_count, root_hash, commitment_scheme, schema_version, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const batchRes = await client.query(batchQ, [
        commitments[0].occurred_at, commitments[commitments.length - 1].occurred_at, commitments.length, `0x${rootHash}`, 'PLACEHOLDER_V0', 1, 'READY'
    ]);

    console.log("\n====== PAYLOAD FOR WALKTHROUGH EVIDENCE ======");
    console.log(`SELECT * FROM public.zk_event_registry WHERE enabled = true ORDER BY event_type;`);
    console.log(Array.from(registryMap.keys()));
    console.log("\nSELECT event_type, circuit_id, schema_version, occurred_at, public_inputs, public_inputs_hash_keccak FROM public.zk_event_receipts;");
    console.log(JSON.stringify(inserted.rows[0].public_inputs, null, 2));
    console.log("\nSELECT * FROM public.zk_rollup_batches ORDER BY created_at DESC LIMIT 1;");
    console.log(JSON.stringify(batchRes.rows[0], null, 2));

    // Run No-PII check
    const piiCheck = await client.query(`
        SELECT COUNT(*) AS pii_key_hits
        FROM public.zk_event_receipts
        WHERE public_inputs ?| ARRAY[
          'artifact_object_key','identity_verification_id','admin_note','phone','ci','address','school_name','company_name','raw_text'
        ];
    `);
    console.log("\nPII HIT COUNT:", piiCheck.rows[0].pii_key_hits);

    await client.end();
}
run();
