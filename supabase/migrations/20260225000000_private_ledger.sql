-- ==========================================
-- SOULBOUND MVP - PRIVATE LEDGER & TREASURY
-- ==========================================

BEGIN;

-- 1) Enums (Safe Enum Creation via DO Block)
DO $$ BEGIN
  CREATE TYPE public.soul_tx_type AS ENUM (
    'AIRDROP',
    'GAS_FEE_BURN',
    'GAS_FEE_TIP',
    'REWARD_MINT',
    'SLASHING_BURN',
    'SLASHING_COMPENSATE',
    'TREASURY_GRANT',
    'TREASURY_SPEND'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soul_hold_state AS ENUM ('PENDING','RELEASED','SLASHED','CANCELLED','DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) System Accounts (Treasury Singleton)
CREATE TABLE IF NOT EXISTS public.treasury_wallet (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT treasury_wallet_singleton CHECK (id = 1)
);

-- 3) Tables

-- 3.1) Wallet Cache (Derived from Ledger, direct updates blocked via RLS and policies)
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2) Append-only Ledger (The Source of Truth)
-- user_id=NULL indicates a Treasury transaction
CREATE TABLE IF NOT EXISTS public.token_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,                    -- + issuance, - deduction
  type public.soul_tx_type NOT NULL,
  related_id UUID,                           -- match_id/review_id/dispute_id
  idempotency_key TEXT UNIQUE,               -- Prevents double spending
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,   -- Structured metadata (rules, tags)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT token_ledger_amount_nonzero CHECK (amount <> 0),
  CONSTRAINT token_ledger_user_or_treasury CHECK (
    user_id IS NOT NULL OR (user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS token_ledger_user_time_idx ON public.token_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS token_ledger_related_idx ON public.token_ledger(related_id);

-- 3.3) Holds / Escrow (Pending rewards or slashing targets)
CREATE TABLE IF NOT EXISTS public.token_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  state public.soul_hold_state NOT NULL DEFAULT 'PENDING',
  release_at TIMESTAMPTZ NOT NULL,
  related_id UUID,
  idempotency_key TEXT UNIQUE,
  ai_verdict TEXT,
  ai_confidence NUMERIC,
  ai_flags TEXT[],
  ai_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS token_holds_user_time_idx ON public.token_holds(user_id, release_at ASC);
CREATE INDEX IF NOT EXISTS token_holds_state_release_idx ON public.token_holds(state, release_at);

-- 3.4) Airdrop Claims (Race Condition Defense via BIGSERIAL)
CREATE TABLE IF NOT EXISTS public.soul_airdrop_claims (
  claim_no BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  airdrop_amount BIGINT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL
);

-- 4) RLS & Privileges (Server/Service Role Write Only)

ALTER TABLE public.treasury_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_airdrop_claims ENABLE ROW LEVEL SECURITY;

-- Reads (Self reads for users, Admin config for Treasury)
DROP POLICY IF EXISTS "wallet self read" ON public.user_wallets;
CREATE POLICY "wallet self read" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ledger self read" ON public.token_ledger;
CREATE POLICY "ledger self read" ON public.token_ledger FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "holds self read" ON public.token_holds;
CREATE POLICY "holds self read" ON public.token_holds FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "airdrop_claim self read" ON public.soul_airdrop_claims;
CREATE POLICY "airdrop_claim self read" ON public.soul_airdrop_claims FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "treasury admin read" ON public.treasury_wallet;
CREATE POLICY "treasury admin read" ON public.treasury_wallet 
FOR SELECT USING ((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true);

-- Writes (Strictly NO client writes via RLS)
DROP POLICY IF EXISTS "wallet no client write" ON public.user_wallets;
CREATE POLICY "wallet no client write" ON public.user_wallets FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "ledger no client write" ON public.token_ledger;
CREATE POLICY "ledger no client write" ON public.token_ledger FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "holds no client write" ON public.token_holds;
CREATE POLICY "holds no client write" ON public.token_holds FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "treasury no client write" ON public.treasury_wallet;
CREATE POLICY "treasury no client write" ON public.treasury_wallet FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "airdrop_claim no client write" ON public.soul_airdrop_claims;
CREATE POLICY "airdrop_claim no client write" ON public.soul_airdrop_claims FOR ALL USING (false) WITH CHECK (false);

-- Grant appropriate permissions to service_role and authenticated
REVOKE ALL ON TABLE public.user_wallets FROM anon, authenticated;
REVOKE ALL ON TABLE public.token_ledger FROM anon, authenticated;
REVOKE ALL ON TABLE public.token_holds FROM anon, authenticated;
REVOKE ALL ON TABLE public.treasury_wallet FROM anon, authenticated;
REVOKE ALL ON TABLE public.soul_airdrop_claims FROM anon, authenticated;

-- Authenticated (Read Only where RLS permits)
GRANT SELECT ON TABLE public.user_wallets TO authenticated;
GRANT SELECT ON TABLE public.token_ledger TO authenticated;
GRANT SELECT ON TABLE public.token_holds TO authenticated;
GRANT SELECT ON TABLE public.treasury_wallet TO authenticated;
GRANT SELECT ON TABLE public.soul_airdrop_claims TO authenticated;

-- Service Role (Backend Server Access)
GRANT SELECT ON TABLE public.user_wallets TO service_role;
GRANT SELECT, INSERT ON TABLE public.token_ledger TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.token_holds TO service_role;
GRANT SELECT, UPDATE ON TABLE public.treasury_wallet TO service_role;
GRANT ALL ON TABLE public.soul_airdrop_claims TO service_role;


-- 5) Database Enforcement Mechanisms (MUST)

-- 5.1) Physically Block Ledger Mutations (Append-Only)
CREATE OR REPLACE FUNCTION public.block_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'token_ledger is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_block_ledger_update ON public.token_ledger;
CREATE TRIGGER trg_block_ledger_update
BEFORE UPDATE ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutation();

DROP TRIGGER IF EXISTS trg_block_ledger_delete ON public.token_ledger;
CREATE TRIGGER trg_block_ledger_delete
BEFORE DELETE ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.block_ledger_mutation();


-- 5.2) Wallet Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_user_wallet_on_ledger_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_wallets(user_id, balance, updated_at)
  VALUES (NEW.user_id, NEW.amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = public.user_wallets.balance + EXCLUDED.balance,
    updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_user_wallet ON public.token_ledger;
CREATE TRIGGER trg_sync_user_wallet
AFTER INSERT ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_user_wallet_on_ledger_insert();


-- 5.3) Treasury Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_treasury_on_ledger_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.treasury_wallet(id, balance, updated_at)
  VALUES (1, NEW.amount, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    balance = public.treasury_wallet.balance + EXCLUDED.balance,
    updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_treasury_wallet ON public.token_ledger;
CREATE TRIGGER trg_sync_treasury_wallet
AFTER INSERT ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_treasury_on_ledger_insert();


-- 5.4) Audit Control Views (Detect Overflows/Discrepancies)
CREATE OR REPLACE VIEW public.user_wallet_audit AS
SELECT
  w.user_id,
  w.balance AS wallet_balance,
  COALESCE(SUM(l.amount),0) AS ledger_sum,
  (w.balance - COALESCE(SUM(l.amount),0)) AS diff
FROM public.user_wallets w
LEFT JOIN public.token_ledger l ON l.user_id = w.user_id
GROUP BY w.user_id, w.balance;

CREATE OR REPLACE VIEW public.treasury_wallet_audit AS
SELECT
  t.balance AS treasury_balance,
  COALESCE(SUM(l.amount),0) AS ledger_sum,
  (t.balance - COALESCE(SUM(l.amount),0)) AS diff
FROM public.treasury_wallet t
LEFT JOIN public.token_ledger l ON l.user_id IS NULL
GROUP BY t.id, t.balance;


-- 6) Event Tracing to Integrity Anchors (audit_logs integration)

-- Holds set updated_at
DROP TRIGGER IF EXISTS set_token_holds_updated_at ON public.token_holds;
CREATE TRIGGER set_token_holds_updated_at BEFORE UPDATE ON public.token_holds
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach public.log_audit_event() to all new critical tables to enable cryptographic hashes
DROP TRIGGER IF EXISTS audit_token_ledger_trigger ON public.token_ledger;
CREATE TRIGGER audit_token_ledger_trigger AFTER INSERT ON public.token_ledger
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_token_holds_trigger ON public.token_holds;
CREATE TRIGGER audit_token_holds_trigger AFTER INSERT OR UPDATE OR DELETE ON public.token_holds
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_user_wallets_trigger ON public.user_wallets;
CREATE TRIGGER audit_user_wallets_trigger AFTER INSERT OR UPDATE OR DELETE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_treasury_wallet_trigger ON public.treasury_wallet;
CREATE TRIGGER audit_treasury_wallet_trigger AFTER INSERT OR UPDATE OR DELETE ON public.treasury_wallet
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_soul_airdrop_claims_trigger ON public.soul_airdrop_claims;
CREATE TRIGGER audit_soul_airdrop_claims_trigger AFTER INSERT ON public.soul_airdrop_claims
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

COMMIT;
