-- Phase 4.2++ Additive Patch: ZK Rollup Readiness (Backend-wide, SSOT-parallel)

-- 1. (DEPRECATED) v0 mock tables exist but are no longer actively used, preserved for additive history.
-- DO NOT USE DROP TABLE ... CASCADE. Use Admin Control APIs to reset.

-- 2. ZK Event Registry (Allowlist)
CREATE TABLE IF NOT EXISTS public.zk_event_registry (
    event_type TEXT PRIMARY KEY,
    circuit_id TEXT NOT NULL,
    public_inputs_schema_version INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    notes TEXT
);

ALTER TABLE public.zk_event_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_event_registry_select" ON public.zk_event_registry FOR SELECT USING (true);
CREATE POLICY "zk_event_registry_no_mutation" ON public.zk_event_registry FOR ALL USING (false);

-- 3. ZK Event Receipts (SSOT-Parallel)
CREATE TABLE IF NOT EXISTS public.zk_event_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_receipt_id UUID NOT NULL REFERENCES public.event_receipts(id) ON DELETE RESTRICT UNIQUE,
    event_type TEXT NOT NULL REFERENCES public.zk_event_registry(event_type),
    circuit_id TEXT NOT NULL,
    public_inputs JSONB NOT NULL,
    public_inputs_hash_keccak TEXT NOT NULL,
    commitment_scheme TEXT NOT NULL DEFAULT 'PLACEHOLDER_V0',
    commitment_hash TEXT NOT NULL,
    nullifier_hash TEXT UNIQUE,
    schema_version INT NOT NULL DEFAULT 0,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.zk_event_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_event_receipts_select" ON public.zk_event_receipts FOR SELECT USING (true);
CREATE POLICY "zk_event_receipts_no_insert" ON public.zk_event_receipts FOR INSERT WITH CHECK (false);

-- 4. Rollup Batches (Slot)
CREATE TABLE IF NOT EXISTS public.zk_rollup_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_start TIMESTAMPTZ NOT NULL,
    batch_end TIMESTAMPTZ NOT NULL,
    items_count INT NOT NULL DEFAULT 0,
    root_hash TEXT,
    commitment_scheme TEXT NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('READY', 'PROVED', 'SUBMITTED', 'SKIPPED', 'FAILED')) DEFAULT 'READY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.zk_rollup_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_rollup_batches_select" ON public.zk_rollup_batches FOR SELECT USING (true);
CREATE POLICY "zk_rollup_batches_no_insert" ON public.zk_rollup_batches FOR INSERT WITH CHECK (false);

-- 5. Rollup Submissions
CREATE TABLE IF NOT EXISTS public.zk_rollup_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.zk_rollup_batches(id) ON DELETE CASCADE,
    chain_id INT NOT NULL DEFAULT 1,
    contract_address TEXT,
    tx_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUBMITTED', 'SKIPPED', 'FAILED')) DEFAULT 'SKIPPED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, chain_id)
);

ALTER TABLE public.zk_rollup_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_rollup_submissions_select" ON public.zk_rollup_submissions FOR SELECT USING (true);
CREATE POLICY "zk_rollup_submissions_no_insert" ON public.zk_rollup_submissions FOR INSERT WITH CHECK (false);


-- 6. Populate Allowlist Registry
INSERT INTO public.zk_event_registry (event_type, circuit_id, public_inputs_schema_version, enabled) VALUES
('VERIFICATIONS_INSERT', 'QUALIFICATION_V0', 1, true),
('VERIFICATIONS_UPDATE', 'QUALIFICATION_V0', 1, true),
('TOKEN_LEDGER_INSERT', 'FRAUD_V0', 1, true),
('INTERVIEWS_INSERT', 'INTERVIEW_CONSIST_V0', 1, true),
('INTERVIEWS_UPDATE', 'INTERVIEW_CONSIST_V0', 1, true),
('SLASH_NO_REVIEW', 'REVIEW_SLA_V0', 1, true)
ON CONFLICT (event_type) DO UPDATE SET circuit_id = EXCLUDED.circuit_id, enabled = EXCLUDED.enabled, public_inputs_schema_version = EXCLUDED.public_inputs_schema_version;


-- 7. (DELETED) event_receipts SSOT-mutation triggers have been strictly removed from history.
-- Canonical JSON is exclusively handled upstream via the Node ETL before DB insertion.
