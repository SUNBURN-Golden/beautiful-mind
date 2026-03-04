-- ==========================================
-- SOULBOUND MVP - SOUL CREDITS UPGRADE (PHASE 3 STEP 0.1)
-- Minimal Blast Radius, Idempotent, Append-Only Preserved
-- ==========================================

BEGIN;

-- -----------------------------------------------------------------------------
-- [1] Naming / Ticker Upgrade (SOUL Credits)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.economy_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  token_display_name TEXT NOT NULL DEFAULT 'SOUL Credits',
  token_ticker TEXT NOT NULL DEFAULT 'SOUL',
  token_decimals SMALLINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT economy_config_singleton CHECK (id = 1)
);

INSERT INTO public.economy_config(id, token_display_name, token_ticker, token_decimals)
VALUES (1, 'SOUL Credits', 'SOUL', 0)
ON CONFLICT (id) DO UPDATE SET
  token_display_name = EXCLUDED.token_display_name,
  token_ticker = EXCLUDED.token_ticker,
  token_decimals = EXCLUDED.token_decimals,
  updated_at = NOW();

ALTER TABLE public.economy_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "economy_config admin read" ON public.economy_config;
CREATE POLICY "economy_config admin read" ON public.economy_config
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

DROP POLICY IF EXISTS "economy_config no client write" ON public.economy_config;
CREATE POLICY "economy_config no client write" ON public.economy_config
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.economy_config FROM anon, authenticated;
GRANT SELECT ON TABLE public.economy_config TO authenticated;
GRANT ALL ON TABLE public.economy_config TO service_role;


-- -----------------------------------------------------------------------------
-- [2] Anti-Farming Airdrop Gating + Tiered Launch Cohorts
-- Note: soul_airdrop_claims table from step 0 is superseded/renamed by soul_airdrop_claims
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.soul_airdrop_claims (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_no BIGSERIAL,
  cohort TEXT NOT NULL,
  amount BIGINT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS soul_airdrop_claims_claim_no_idx ON public.soul_airdrop_claims(claim_no);

ALTER TABLE public.soul_airdrop_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airdrop_claims admin read" ON public.soul_airdrop_claims;
CREATE POLICY "airdrop_claims admin read" ON public.soul_airdrop_claims
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

DROP POLICY IF EXISTS "airdrop_claims no client write" ON public.soul_airdrop_claims;
CREATE POLICY "airdrop_claims no client write" ON public.soul_airdrop_claims
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.soul_airdrop_claims FROM anon, authenticated;
GRANT SELECT ON TABLE public.soul_airdrop_claims TO authenticated;
GRANT ALL ON TABLE public.soul_airdrop_claims TO service_role;

-- Remove old soul_airdrop_claims if it's empty to clean up schema
-- DO $$ BEGIN
--   IF NOT EXISTS (SELECT 1 FROM public.soul_airdrop_claims) THEN
--     DROP TABLE IF EXISTS public.soul_airdrop_claims CASCADE;
--   END IF;
-- END $$;


-- -----------------------------------------------------------------------------
-- [3] Treasury Vault Model (Budgets for emissions check)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.soul_vault_type AS ENUM ('OPS','REWARD','INSURANCE','EXPERIMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.treasury_vaults (
  vault public.soul_vault_type PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.treasury_vaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "treasury_vaults admin read" ON public.treasury_vaults;
CREATE POLICY "treasury_vaults admin read" ON public.treasury_vaults
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

DROP POLICY IF EXISTS "treasury_vaults no client write" ON public.treasury_vaults;
CREATE POLICY "treasury_vaults no client write" ON public.treasury_vaults
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.treasury_vaults FROM anon, authenticated;
GRANT SELECT ON TABLE public.treasury_vaults TO authenticated;
GRANT ALL ON TABLE public.treasury_vaults TO service_role;

INSERT INTO public.treasury_vaults(vault, balance) VALUES
  ('OPS', 0), ('REWARD', 0), ('INSURANCE', 0), ('EXPERIMENT', 0)
ON CONFLICT (vault) DO NOTHING;

-- Budget Emission Caps
CREATE TABLE IF NOT EXISTS public.treasury_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault public.soul_vault_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  max_outflow BIGINT NOT NULL,
  outflow_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault, period_start, period_end)
);

ALTER TABLE public.treasury_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "treasury_budgets admin read" ON public.treasury_budgets;
CREATE POLICY "treasury_budgets admin read" ON public.treasury_budgets
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

DROP POLICY IF EXISTS "treasury_budgets no client write" ON public.treasury_budgets;
CREATE POLICY "treasury_budgets no client write" ON public.treasury_budgets
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.treasury_budgets FROM anon, authenticated;
GRANT SELECT ON TABLE public.treasury_budgets TO authenticated;
GRANT ALL ON TABLE public.treasury_budgets TO service_role;


-- -----------------------------------------------------------------------------
-- [4] Deep Review Co-Authoring (LLM + User) - Grounded Data Collection
-- -----------------------------------------------------------------------------
ALTER TABLE public.match_reviews
  ADD COLUMN IF NOT EXISTS user_raw_text TEXT,
  ADD COLUMN IF NOT EXISTS llm_draft_text TEXT,
  ADD COLUMN IF NOT EXISTS final_text TEXT,
  ADD COLUMN IF NOT EXISTS final_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coauthor_meta JSONB DEFAULT '{}'::jsonb;


-- -----------------------------------------------------------------------------
-- [5] Triggers and Automations for the new tables
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_economy_config_updated_at ON public.economy_config;
CREATE TRIGGER set_economy_config_updated_at BEFORE UPDATE ON public.economy_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_treasury_vaults_updated_at ON public.treasury_vaults;
CREATE TRIGGER set_treasury_vaults_updated_at BEFORE UPDATE ON public.treasury_vaults
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach public.log_audit_event() only to tables where row/event tracing makes sense and where id is an actual UUID
DROP TRIGGER IF EXISTS audit_treasury_budgets_trigger ON public.treasury_budgets;
CREATE TRIGGER audit_treasury_budgets_trigger AFTER INSERT OR UPDATE OR DELETE ON public.treasury_budgets
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- NOTE: soul_airdrop_claims uses `user_id` as PK, economics_config uses `id: SMALLINT`, treasury_vaults uses `vault: VARCHAR`
-- To prevent the same audit trigger bugs from Step 0, we do not attach `log_audit_event` to them.
-- token_ledger and token_holds and match_reviews already log securely to the anchor.

COMMIT;
