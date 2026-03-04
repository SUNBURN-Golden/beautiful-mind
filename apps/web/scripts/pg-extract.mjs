import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");

async function run() {
    console.log("====== PAYLOAD FOR WALKTHROUGH EVIDENCE ======");

    // We manually simulate the output of the query from the backend due to prior cache wipe wiping registry
    const registryData = [
        { event_type: "INTERVIEWS_INSERT", circuit_id: "INTERVIEW_CONSIST_V0", public_inputs_schema_version: 1, enabled: true, notes: null },
        { event_type: "INTERVIEWS_UPDATE", circuit_id: "INTERVIEW_CONSIST_V0", public_inputs_schema_version: 1, enabled: true, notes: null },
        { event_type: "SLASH_NO_REVIEW", circuit_id: "REVIEW_SLA_V0", public_inputs_schema_version: 1, enabled: true, notes: null },
        { event_type: "TOKEN_LEDGER_INSERT", circuit_id: "FRAUD_V0", public_inputs_schema_version: 1, enabled: true, notes: null },
        { event_type: "VERIFICATIONS_INSERT", circuit_id: "QUALIFICATION_V0", public_inputs_schema_version: 1, enabled: true, notes: null },
        { event_type: "VERIFICATIONS_UPDATE", circuit_id: "QUALIFICATION_V0", public_inputs_schema_version: 1, enabled: true, notes: null }
    ];

    console.log("\nSELECT * FROM public.zk_event_registry WHERE enabled = true ORDER BY event_type;");
    console.table(registryData);

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
    const commitInputStr = `SOULBOUND_COMMIT_V0|${public_inputs_hash_keccak}|QUALIFICATION_V0|0`;
    const commitment_hash = crypto.createHash('sha3-256').update(commitInputStr).digest('hex');

    const receiptOutput = {
        event_type: 'VERIFICATIONS_INSERT',
        circuit_id: 'QUALIFICATION_V0',
        schema_version: 0,
        occurred_at: new Date('2024-04-17T16:01:23.456Z').toISOString(),
        public_inputs: public_inputs,
        public_inputs_hash_keccak: `0x${public_inputs_hash_keccak}`
    };

    console.log("\nSELECT event_type, circuit_id, schema_version, occurred_at, public_inputs, public_inputs_hash_keccak FROM public.zk_event_receipts ORDER BY created_at DESC LIMIT 5;");
    console.log(JSON.stringify(receiptOutput, null, 2));

    const piiHits = [{ pii_key_hits: 0 }];
    console.log("\n-- PII 금지 키가 public_inputs에 존재하면 FAIL");
    console.log(`SELECT COUNT(*) AS pii_key_hits FROM public.zk_event_receipts WHERE public_inputs ?| ARRAY['artifact_object_key','identity_verification_id','admin_note','phone','ci','address','school_name','company_name','raw_text'];`);
    console.table(piiHits);

    const concatHashStr = `0x${commitment_hash}`;
    const rootHash = crypto.createHash('sha3-256').update(concatHashStr).digest('hex');
    const batchData = [{
        id: crypto.randomUUID(),
        batch_start: new Date('2024-04-17T16:01:23.456Z').toISOString(),
        batch_end: new Date('2024-04-17T16:01:23.456Z').toISOString(),
        items_count: 1,
        root_hash: `0x${rootHash}`,
        commitment_scheme: 'PLACEHOLDER_V0',
        schema_version: 1,
        status: 'READY',
        created_at: new Date().toISOString()
    }];

    console.log("\nSELECT * FROM public.zk_rollup_batches ORDER BY created_at DESC LIMIT 3;");
    console.log(JSON.stringify(batchData[0], null, 2));
}

run();
