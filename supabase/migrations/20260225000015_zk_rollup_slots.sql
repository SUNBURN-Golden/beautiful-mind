-- Phase 4.2 Additive Patch: ZK Rollup Readiness Slots (No Proof Generation)

-- 1. ZK Nullifiers (Double-Spend / Re-use Prevention)
CREATE TABLE IF NOT EXISTS public.zk_nullifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash TEXT NOT NULL,
    context TEXT NOT NULL, -- e.g., 'QUALIFICATION', 'INCOME_TIER'
    nullifier_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for zk_nullifiers
ALTER TABLE public.zk_nullifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_nullifiers select own hash" ON public.zk_nullifiers FOR SELECT USING (true); -- Public verifiable
CREATE POLICY "zk_nullifiers no client write" ON public.zk_nullifiers FOR INSERT WITH CHECK (false);

-- 2. ZK Commitments (PII-free fact anchoring)
CREATE TABLE IF NOT EXISTS public.zk_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_receipt_id UUID REFERENCES public.event_receipts(id) ON DELETE SET NULL, -- Loose coupling to Phase 4 Layer
    commitment_scheme TEXT NOT NULL, -- e.g., 'POSEIDON_V1'
    commitment_hash TEXT NOT NULL, -- 0x...
    public_inputs JSONB NOT NULL, -- EXCLUSIVELY PII-free: user_id_hash, badge flags, tier codes, timestamp bucket
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for zk_commitments
ALTER TABLE public.zk_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_commitments select all" ON public.zk_commitments FOR SELECT USING (true);
CREATE POLICY "zk_commitments no client write" ON public.zk_commitments FOR INSERT WITH CHECK (false);

-- 3. (DEPRECATED) ZK Rollup Batches (Aggregation slot)
-- Table creation moved to 16_zk_ssot_parallel.sql to avoid duplicate conflicts and ensure SSOT constraints.

-- 4. ZK Proofs (Future execution slot)
CREATE TABLE IF NOT EXISTS public.zk_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    proof_bytes TEXT, -- base64 or hex proof data (future)
    verifier_key_hash TEXT,
    chain_id INT NOT NULL DEFAULT 1,
    tx_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'SKIPPED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for zk_proofs
ALTER TABLE public.zk_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zk_proofs select all" ON public.zk_proofs FOR SELECT USING (true);
CREATE POLICY "zk_proofs no client write" ON public.zk_proofs FOR INSERT WITH CHECK (false);
CREATE POLICY "zk_proofs no client update" ON public.zk_proofs FOR UPDATE USING (false);
