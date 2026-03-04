DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_receipt_id UUID := gen_random_uuid();
    v_public_inputs JSONB;
    v_meta JSONB := '{"verification_type": "ID_CARD", "status": "VERIFIED", "tier_result": "A", "band_result": "MILLENNIAL", "adjudication_reason": "Automated AI Approval"}'::jsonb;
    v_keccak TEXT;
    v_commit_str TEXT;
    v_commit_hash TEXT;
    v_circuit_id TEXT;
    inserted_receipt RECORD;
    v_concat_hashes TEXT := '';
    v_root_hash TEXT;
    inserted_batch RECORD;
BEGIN
    SELECT circuit_id INTO v_circuit_id FROM public.zk_event_registry WHERE event_type = 'VERIFICATIONS_INSERT';
    
    v_public_inputs := jsonb_build_object(
        'user_id_hash', encode(digest(v_user_id::text, 'sha256'), 'hex'),
        'event_type', 'VERIFICATIONS_INSERT',
        'timestamp_bucket', EXTRACT(EPOCH FROM '2024-04-17T16:00:00Z'::timestamp) * 1000
    ) || v_meta;
    
    v_keccak := encode(digest(v_public_inputs::text, 'sha256'), 'hex');
    v_commit_str := 'SOULBOUND_COMMIT_V0|' || v_keccak || '|' || v_circuit_id || '|0';
    v_commit_hash := encode(digest(v_commit_str, 'sha256'), 'hex');
    
    INSERT INTO public.zk_event_receipts (source_receipt_id, event_type, circuit_id, public_inputs, public_inputs_hash_keccak, commitment_scheme, commitment_hash, nullifier_hash, schema_version, occurred_at)
    VALUES (v_receipt_id, 'VERIFICATIONS_INSERT', v_circuit_id, v_public_inputs, v_keccak, 'PLACEHOLDER_V0', v_commit_hash, null, 0, now())
    RETURNING * INTO inserted_receipt;
    
    RAISE NOTICE '--- (2) ZK_EVENT_RECEIPTS - PUBLIC INPUTS ---';
    RAISE NOTICE '%', inserted_receipt.public_inputs::text;
    
    SELECT string_agg(commitment_hash, '') INTO v_concat_hashes FROM (SELECT commitment_hash FROM public.zk_event_receipts LIMIT 10) sub;
    v_root_hash := encode(digest(v_concat_hashes, 'sha256'), 'hex');
    
    INSERT INTO public.zk_rollup_batches (batch_start, batch_end, items_count, root_hash, commitment_scheme, schema_version, status)
    VALUES (inserted_receipt.occurred_at, inserted_receipt.occurred_at, 1, v_root_hash, 'PLACEHOLDER_V0', 1, 'READY')
    RETURNING * INTO inserted_batch;
    
    RAISE NOTICE '--- (3) ZK_ROLLUP_BATCHES - READY STATE ---';
    RAISE NOTICE 'batch_root: %', inserted_batch.root_hash;
    RAISE NOTICE 'status: %', inserted_batch.status;
END $$;
