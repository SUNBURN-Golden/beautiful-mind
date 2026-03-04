-- Migrate L1 Readiness Privacy Hardening (Additive)

CREATE TABLE IF NOT EXISTS public.event_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    action TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    canonical_json JSONB NOT NULL,
    canonical_text TEXT NOT NULL,
    receipt_hash_keccak TEXT UNIQUE NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deny Client Writes
ALTER TABLE public.event_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts no client write" ON public.event_receipts FOR ALL USING (false);
CREATE POLICY "receipts no client read" ON public.event_receipts FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.merkle_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'audit_logs',
    batch_start TIMESTAMPTZ NOT NULL,
    batch_end TIMESTAMPTZ NOT NULL,
    items_count INT NOT NULL,
    merkle_root_keccak TEXT UNIQUE NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deny Client Writes
ALTER TABLE public.merkle_anchors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anchors no client write" ON public.merkle_anchors FOR ALL USING (false);
CREATE POLICY "anchors no client read" ON public.merkle_anchors FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.anchor_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_id UUID NOT NULL REFERENCES public.merkle_anchors(id) ON DELETE CASCADE,
    tx_hash TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deny Client Writes
ALTER TABLE public.anchor_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions no client write" ON public.anchor_submissions FOR ALL USING (false);
CREATE POLICY "submissions no client read" ON public.anchor_submissions FOR SELECT USING (false);

-- Ensure deterministic indices for fast reconstruction and duplicate prevention
CREATE INDEX IF NOT EXISTS event_receipts_source_idx ON public.event_receipts(source_table, source_id, action);
CREATE INDEX IF NOT EXISTS event_receipts_time_idx ON public.event_receipts(occurred_at ASC, source_id ASC);
CREATE INDEX IF NOT EXISTS merkle_anchors_source_batch_idx ON public.merkle_anchors(source, batch_start, batch_end);
