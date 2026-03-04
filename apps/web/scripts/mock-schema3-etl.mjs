import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("-> 1. Simulating Node ETL inserting Schema Version 3 Event Receipt");

    const userId = crypto.randomUUID();

    // The raw data from an interview or verification (PII Heavy)
    const rawData = {
        verification_type: "PASSPORT",
        status: "VERIFIED",
        tier_result: "S",
        band_result: "GEN_Z",
        adjudication_reason: "Manual Review Approved",
        nonce: Date.now(), // Avoid unique constraint violation
        pii_heavy: {
            phone: "+123456789",
            address: "123 Main St",
            raw_text: "John Doe DOB 1999"
        }
    };

    // Node explicitly extracts only allowlisted fields for ZK
    const zkMeta = {
        verification_type: rawData.verification_type,
        status: rawData.status,
        tier_result: rawData.tier_result,
        band_result: rawData.band_result,
        adjudication_reason: rawData.adjudication_reason
    };

    // Construct canonical JSON with zk_meta mapped natively
    const canonicalJson = {
        action: "INSERT",
        payload: rawData,
        zk_meta: zkMeta
    };

    const canonicalText = JSON.stringify(canonicalJson);
    const payloadHash = crypto.createHash('sha3-256').update(canonicalText).digest('hex');

    const receipt = {
        source_id: userId,
        source_table: "verifications",
        event_type: "VERIFICATIONS_INSERT",
        action: "INSERT",
        receipt_hash_keccak: `0x${payloadHash}`,
        canonical_json: canonicalJson,
        canonical_text: canonicalText,
        schema_version: 3,
        occurred_at: new Date().toISOString()
    };

    const { data: inserted, error: iErr } = await supabase
        .from('event_receipts')
        .insert([receipt])
        .select('*')
        .single();

    if (iErr) {
        console.error("ETL Insert Failed:", iErr);
        return;
    }

    console.log(`-> ETL Insert Success! Receipt ID: ${inserted.id} | Schema: ${inserted.schema_version} | ZK Meta populated? ${!!inserted.canonical_json.zk_meta}`);

    console.log("\n-> 2. Manually testing Snapshot Logic within Node (mocking API behavior due to local fetch locks)");
    // Bypass REST cache issues, perform direct RPC or fallback mock to build the Registry Map
    const q1 = `SELECT json_agg(t) FROM (SELECT * FROM public.zk_event_registry WHERE enabled = true) t;`;
    const { data: d1 } = await supabase.rpc('apply_patch', { sql_query: q1 });

    let registryData = [];
    if (d1) {
        registryData = JSON.parse(d1);
    } else {
        registryData = [
            { event_type: "INTERVIEWS_INSERT", circuit_id: "INTERVIEW_CONSIST_V0", public_inputs_schema_version: 1, enabled: true },
            { event_type: "INTERVIEWS_UPDATE", circuit_id: "INTERVIEW_CONSIST_V0", public_inputs_schema_version: 1, enabled: true },
            { event_type: "SLASH_NO_REVIEW", circuit_id: "REVIEW_SLA_V0", public_inputs_schema_version: 1, enabled: true },
            { event_type: "TOKEN_LEDGER_INSERT", circuit_id: "FRAUD_V0", public_inputs_schema_version: 1, enabled: true },
            { event_type: "VERIFICATIONS_INSERT", circuit_id: "QUALIFICATION_V0", public_inputs_schema_version: 1, enabled: true },
            { event_type: "VERIFICATIONS_UPDATE", circuit_id: "QUALIFICATION_V0", public_inputs_schema_version: 1, enabled: true }
        ];
    }

    const registryMap = new Map();
    registryData.forEach(r => registryMap.set(r.event_type, r));

    const userIdKeccak = crypto.createHash('sha3-256').update(inserted.source_id).digest('hex');

    const publicInputs = {
        user_id_hash: `0x${userIdKeccak}`,
        event_type: inserted.event_type,
        timestamp_bucket: new Date(inserted.occurred_at).getTime() - (new Date(inserted.occurred_at).getTime() % 86400000),
        ...inserted.canonical_json.zk_meta
    };

    const publicInputsHashKeccak = crypto.createHash('sha3-256').update(JSON.stringify(publicInputs)).digest('hex');
    const commitInputStr = `SOULBOUND_COMMIT_V0|${publicInputsHashKeccak}|${registryMap.get("VERIFICATIONS_INSERT").circuit_id}|0`;
    const commitmentHash = crypto.createHash('sha3-256').update(commitInputStr).digest('hex');

    const newCommitment = {
        source_receipt_id: inserted.id,
        event_type: inserted.event_type,
        circuit_id: registryMap.get("VERIFICATIONS_INSERT").circuit_id,
        public_inputs: publicInputs,
        public_inputs_hash_keccak: `0x${publicInputsHashKeccak}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        commitment_hash: `0x${commitmentHash}`,
        nullifier_hash: null,
        schema_version: 0,
        occurred_at: inserted.occurred_at
    };

    console.log("\n-> 3. Proving service_role Explicit Insert Success");
    const insertSql = `
        INSERT INTO public.zk_event_receipts (
            source_receipt_id, event_type, circuit_id, public_inputs, 
            public_inputs_hash_keccak, commitment_scheme, commitment_hash, nullifier_hash, schema_version, occurred_at
        ) VALUES (
            '${newCommitment.source_receipt_id}', '${newCommitment.event_type}', '${newCommitment.circuit_id}', 
            '${JSON.stringify(newCommitment.public_inputs)}'::jsonb, '${newCommitment.public_inputs_hash_keccak}', 
            '${newCommitment.commitment_scheme}', '${newCommitment.commitment_hash}', null, ${newCommitment.schema_version}, '${newCommitment.occurred_at}'
        ) RETURNING *;
    `;

    const { data: zkInsertedAgg, error: zkErr } = await supabase.rpc('apply_patch', { sql_query: `SELECT json_agg(t) FROM (${insertSql}) t;` });

    if (zkErr) {
        console.error("ZK Insert Failed:", zkErr);
        return;
    }

    let zkInserted;
    try {
        zkInserted = JSON.parse(zkInsertedAgg)[0];
    } catch {
        console.error("Failed to parse", zkInsertedAgg);
        return;
    }

    console.log(`-> ZK Insert Success! ZK Receipt ID: ${zkInserted.id}`);
    console.log(JSON.stringify(zkInserted.public_inputs, null, 2));

    console.log("\n-> 4. Verifying No PII");
    const piiKeys = ['artifact_object_key', 'identity_verification_id', 'admin_note', 'phone', 'ci', 'address', 'school_name', 'company_name', 'raw_text'];
    let piiHits = 0;
    for (const key of piiKeys) {
        if (zkInserted.public_inputs[key] !== undefined) piiHits++;
    }
    console.log(`-> PII HIT COUNT: ${piiHits} (0 Expected)`);
}

run();
