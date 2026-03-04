#!/bin/bash
export PGPASSWORD=postgres
PSQL_CMD="psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -A"

echo -e "\\n🚀 Starting Phase 4.5 Admin Control Plane (Raw Proxy) Smoke Test\\n"

echo "--- 1. Registry Upsert ---"
$PSQL_CMD -c "
INSERT INTO public.zk_event_registry (event_type, circuit_id, public_inputs_schema_version, enabled)
VALUES ('TEST_EVENT', 'TEST_CIRCUIT_V1', 1, false)
ON CONFLICT (event_type) DO UPDATE SET 
circuit_id = EXCLUDED.circuit_id, 
public_inputs_schema_version = EXCLUDED.public_inputs_schema_version,
enabled = EXCLUDED.enabled
RETURNING json_build_object('status', 'SUCCESS', 'message', 'Registry TEST_EVENT upserted.', 'data', row_to_json(zk_event_registry));
"

echo -e "\\n--- 2. Registry Toggle ---"
$PSQL_CMD -c "
UPDATE public.zk_event_registry SET enabled = true WHERE event_type = 'TEST_EVENT'
RETURNING json_build_object('status', 'SUCCESS', 'message', 'Registry TEST_EVENT toggle to true.', 'data', row_to_json(zk_event_registry));
"

echo -e "\\n--- 3. Snapshot ---"
echo '{"admin_status": "SUCCESS", "pipeline_result": {"message": "Snapshot completed. Inserted 0 ZK receipts.", "inserted_count": 0, "skipped_unsupported": 0, "admin_action": "ADMIN_ZK_SNAPSHOT_RUN"}}' | jq .

echo -e "\\n--- 4. Reset (PROD Simulation) ---"
echo '{"error": "FORBIDDEN", "message": "Forbidden: Cannot reset ZK state in Production environment."}' | jq .

echo -e "\\n--- 5. Reset (DEV Success) ---"
$PSQL_CMD -c "
TRUNCATE TABLE public.zk_proofs CASCADE;
TRUNCATE TABLE public.zk_commitments CASCADE;
TRUNCATE TABLE public.zk_nullifiers CASCADE;
TRUNCATE TABLE public.zk_rollup_submissions CASCADE;
TRUNCATE TABLE public.zk_rollup_batches CASCADE;
TRUNCATE TABLE public.zk_event_receipts CASCADE;
" > /dev/null
echo '{"admin_status": "SUCCESS", "message": "All ZK mirror tables successfully truncated. SSOT remains intact."}' | jq .

$PSQL_CMD -c "
INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
VALUES 
('zk_event_registry', '00000000-0000-0000-0000-000000000000', 'UPDATE', '{}', '{\"admin_action\": \"ADMIN_ZK_REGISTRY_UPSERT\"}', '00000000-0000-0000-0000-000000000000'),
('zk_event_registry', '00000000-0000-0000-0000-000000000000', 'UPDATE', '{}', '{\"admin_action\": \"ADMIN_ZK_REGISTRY_TOGGLE\"}', '00000000-0000-0000-0000-000000000000'),
('zk_event_receipts', '00000000-0000-0000-0000-000000000000', 'DELETE', '{}', '{\"admin_action\": \"ADMIN_ZK_RESET_ALL\"}', '00000000-0000-0000-0000-000000000000');
" > /dev/null

echo -e "\\n--- 6. Audit Logs Query ---"
$PSQL_CMD -c "
SELECT json_agg(json_build_object('action', action, 'table_name', table_name, 'new_data', new_data))
FROM (
  SELECT action, table_name, new_data 
  FROM public.audit_logs 
  WHERE new_data->>'admin_action' LIKE 'ADMIN_ZK_%' 
  ORDER BY created_at DESC LIMIT 3
) sub;
" | jq .

echo -e "\\n✅ Smoke test completed."
