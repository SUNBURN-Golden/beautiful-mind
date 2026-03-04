-- Phase 1.1 Additive Patch: Admission Gate (No-Trust Hard Gate v1.1)

-- 1. Identity Claims (Insert-Only, Immutable)
CREATE TABLE IF NOT EXISTS public.identity_claims (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name_hash TEXT,
    birth_year SMALLINT,
    gender TEXT,
    phone_encrypted TEXT,
    ci_hash TEXT NOT NULL,
    identity_verification_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Trigger: Block UPDATE and DELETE on identity_claims
CREATE OR REPLACE FUNCTION public.block_identity_claims_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Mutations (UPDATE/DELETE) on identity_claims are strictly forbidden by systemic No-Trust policy.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_block_identity_claims_update ON public.identity_claims;
CREATE TRIGGER tr_block_identity_claims_update
    BEFORE UPDATE ON public.identity_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.block_identity_claims_mutation();

DROP TRIGGER IF EXISTS tr_block_identity_claims_delete ON public.identity_claims;
CREATE TRIGGER tr_block_identity_claims_delete
    BEFORE DELETE ON public.identity_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.block_identity_claims_mutation();

-- RLS for identity_claims
ALTER TABLE public.identity_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "identity_claims select own" ON public.identity_claims FOR SELECT USING (auth.uid() = user_id);
-- Service role bypasses RLS for INSERTs, clients cannot write.
CREATE POLICY "identity_claims no client write" ON public.identity_claims FOR INSERT WITH CHECK (false);

-- 2. Verifications (6-Pillars Lifecycle)
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PHYSICAL','RESIDENCE','CAREER','EDUCATION','INCOME','ASSET')),
    status TEXT NOT NULL CHECK (status IN ('PENDING','AI_VERIFIED','VERIFIED','REJECTED')),
    extracted_value JSONB, -- band/tier only
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    payload_hash_keccak TEXT,
    artifact_object_key TEXT,
    artifact_expires_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for verifications
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications select own" ON public.verifications FOR SELECT USING (auth.uid() = user_id);
-- No client write.
CREATE POLICY "verifications no client write" ON public.verifications FOR INSERT WITH CHECK (false);
CREATE POLICY "verifications no client update" ON public.verifications FOR UPDATE USING (false);

-- Audit Trigger for verifications (AFTER INSERT/UPDATE only)
DROP TRIGGER IF EXISTS tr_audit_verifications_insert ON public.verifications;
CREATE TRIGGER tr_audit_verifications_insert
    AFTER INSERT ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS tr_audit_verifications_update ON public.verifications;
CREATE TRIGGER tr_audit_verifications_update
    AFTER UPDATE ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.log_audit_event();
-- Intentionally NO DELETE trigger per requirements

-- 3. Profiles Additive Fields (Derived Data Only)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS birth_year SMALLINT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS height_cm SMALLINT,
ADD COLUMN IF NOT EXISTS weight_band TEXT,
ADD COLUMN IF NOT EXISTS location_region TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS verified_badges JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Prevent client overwrites on is_verified via profiles RLS is already handled if profiles RLS is strict,
-- however we rely on Server Actions for modifications anyway.

-- 4. Verification Artifacts (Immutable storage reference) - Optional as we have it in verifications, 
-- but added for strict Purge safety if needed (skipped here to use verifications TTL directly per doc preference)
