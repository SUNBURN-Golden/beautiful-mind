import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://fcqsdfpbwqjpvpunrxdh.supabase.co", "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS");

async function run() {
    const q1 = `SELECT json_agg(t) FROM (SELECT * FROM public.zk_event_registry WHERE enabled = true) t;`;
    const { data: d1 } = await supabase.rpc('apply_patch', { sql_query: q1 });
    console.log("Registry:", d1);

    const q2 = `
    DO $$
    DECLARE
        v_user UUID := gen_random_uuid();
        v_receipt UUID := gen_random_uuid();
        v_public JSONB := jsonb_build_object('user_id_hash', encode(digest(v_user::text, 'sha256'), 'hex'), 'event_type', 'VERIFICATIONS_INSERT', 'timestamp_bucket', EXTRACT(EPOCH FROM '2024-04-17T16:00:00Z'::timestamp)*1000, 'verification_type', 'ID_CARD', 'status', 'VERIFIED', 'tier_result', 'A', 'band_result', 'MILLENNIAL', 'adjudication_reason', 'Automated AI Approval');
        v_k TEXT := encode(digest(v_public::text, 'sha256'), 'hex');
        v_c TEXT := encode(digest('SOULBOUND_COMMIT_V0|'||v_k||'|QUALIFICATION_V0|0', 'sha256'), 'hex');
    BEGIN
        INSERT INTO public.zk_event_receipts (source_receipt_id, event_type, circuit_id, public_inputs, public_inputs_hash_keccak, commitment_scheme, commitment_hash, schema_version, occurred_at)
        VALUES (v_receipt, 'VERIFICATIONS_INSERT', 'QUALIFICATION_V0', v_public, v_k, 'PLACEHOLDER_V0', v_c, 0, now());
        
        INSERT INTO public.zk_rollup_batches (batch_start, batch_end, items_count, root_hash, commitment_scheme, schema_version, status)
        VALUES (now(), now(), 1, encode(digest(v_c, 'sha256'), 'hex'), 'PLACEHOLDER_V0', 1, 'READY');
    END $$;
    `;
    await supabase.rpc('apply_patch', { sql_query: q2 });

    const q3 = `SELECT json_agg(t) FROM (SELECT public_inputs FROM public.zk_event_receipts LIMIT 1) t;`;
    const { data: d3 } = await supabase.rpc('apply_patch', { sql_query: q3 });
    console.log("\nReceipt Inputs:", JSON.stringify(d3, null, 2));

    const q4 = `SELECT json_agg(t) FROM (SELECT * FROM public.zk_rollup_batches LIMIT 1) t;`;
    const { data: d4 } = await supabase.rpc('apply_patch', { sql_query: q4 });
    console.log("\nBatch:", JSON.stringify(d4, null, 2));
}
run();
