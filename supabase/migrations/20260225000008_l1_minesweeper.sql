-- Additive Patch for L1-Readiness (Minesweeper fixes)

-- [P0-3] Concurrency / Idempotency 
-- Prevent the exact same audit log from mapped into multiple receipts
ALTER TABLE public.event_receipts 
ADD CONSTRAINT event_receipts_source_table_source_id_key UNIQUE (source_table, source_id);

-- Prevent multiple overlapping roots being anchored for the exact same batch time bounds
ALTER TABLE public.merkle_anchors 
ADD CONSTRAINT merkle_anchors_source_batch_end_schema_version_key UNIQUE (source, batch_end, schema_version);

-- [P0-5] Incremental Watermark Processing
-- Add column to efficiently track where the snapshot paused
ALTER TABLE public.merkle_anchors
ADD COLUMN last_audit_id UUID;
