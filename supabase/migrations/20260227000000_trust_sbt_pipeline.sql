-- =============================================================================
-- SoulBound MVP - Trust SBT / Audit / Challenge / Enforcement Pipeline
-- fcqs master backend additive migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Ledger enum extension (append-only ledger event types)
-- -----------------------------------------------------------------------------
ALTER TYPE public.soul_tx_type ADD VALUE IF NOT EXISTS 'COLLATERAL_DEPOSIT';
ALTER TYPE public.soul_tx_type ADD VALUE IF NOT EXISTS 'COLLATERAL_REFUND';
ALTER TYPE public.soul_tx_type ADD VALUE IF NOT EXISTS 'COLLATERAL_SLASH';

-- -----------------------------------------------------------------------------
-- 1) New enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.sbt_trust_level AS ENUM ('LOW','HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_claim_status AS ENUM ('PENDING','ACTIVE','FROZEN','DISHONORED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_issuer AS ENUM ('SELF','AUDIT','CHALLENGE','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_audit_type AS ENUM ('RANDOM','CHALLENGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_audit_state AS ENUM ('OPEN','FROZEN','UNDER_REVIEW','RESOLVED_PASS','RESOLVED_FAIL','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_challenge_state AS ENUM ('OPEN','LINKED_TO_AUDIT','RESOLVED_PASS','RESOLVED_FAIL','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_enforcement_action AS ENUM ('FREEZE','PENALTY','SLASH','REVOKE_SBT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sbt_due_process_state AS ENUM ('NOTIFIED','RESPONDED','FINALIZED','EXECUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Profiles freeze fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freeze_updated_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 3) Feature flags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES
  ('COLLATERAL_REQUIRED_ON_SIGNUP', false, 'If true, collateral deposit is required before self-claim issuance'),
  ('COLLATERAL_REQUIRED_FOR_HIGH_TRUST', false, 'If true, collateral deposit is required before HIGH trust promotion'),
  ('ZK_ROUTES_ENABLED', false, 'If true, enables CRON-only ZK preparation routes')
ON CONFLICT (flag_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4) Core tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sbt_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  trust_level public.sbt_trust_level NOT NULL DEFAULT 'LOW',
  status public.sbt_claim_status NOT NULL DEFAULT 'PENDING',
  issuer public.sbt_issuer NOT NULL DEFAULT 'SELF',
  claim_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_audit_id UUID,
  source_challenge_id UUID,
  issued_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sbt_claims_user_created_idx ON public.sbt_claims(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sbt_claims_status_idx ON public.sbt_claims(status);
CREATE UNIQUE INDEX IF NOT EXISTS sbt_claims_active_unique_idx
ON public.sbt_claims(user_id, claim_type)
WHERE status IN ('PENDING','ACTIVE','FROZEN');

CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type public.sbt_audit_type NOT NULL,
  subject_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.sbt_claims(id) ON DELETE CASCADE,
  challenge_id UUID,
  state public.sbt_audit_state NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decision_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_subject_state_idx ON public.audits(subject_user_id, state);
CREATE INDEX IF NOT EXISTS audits_claim_idx ON public.audits(claim_id);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.sbt_claims(id) ON DELETE CASCADE,
  audit_id UUID,
  evidence_ref TEXT NOT NULL,
  state public.sbt_challenge_state NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT challenges_no_self_challenge CHECK (challenger_user_id <> subject_user_id)
);

CREATE INDEX IF NOT EXISTS challenges_subject_state_idx ON public.challenges(subject_user_id, state);
CREATE INDEX IF NOT EXISTS challenges_claim_idx ON public.challenges(claim_id);

CREATE TABLE IF NOT EXISTS public.collateral_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  total_deposited BIGINT NOT NULL DEFAULT 0,
  total_refunded BIGINT NOT NULL DEFAULT 0,
  total_slashed BIGINT NOT NULL DEFAULT 0,
  last_ledger_id UUID REFERENCES public.token_ledger(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT collateral_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT collateral_totals_non_negative CHECK (
    total_deposited >= 0 AND total_refunded >= 0 AND total_slashed >= 0
  )
);

CREATE INDEX IF NOT EXISTS collateral_accounts_user_idx ON public.collateral_accounts(user_id);

CREATE TABLE IF NOT EXISTS public.enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.sbt_claims(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  action_type public.sbt_enforcement_action NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_process_state public.sbt_due_process_state NOT NULL DEFAULT 'NOTIFIED',
  reason TEXT,
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  decision_by UUID REFERENCES auth.users(id),
  executed_ledger_id UUID REFERENCES public.token_ledger(id),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enforcement_target_state_idx
ON public.enforcement_actions(target_user_id, due_process_state, action_type);

-- -----------------------------------------------------------------------------
-- 5) Cross-table FKs (safe add)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sbt_claims_source_audit_id_fkey'
  ) THEN
    ALTER TABLE public.sbt_claims
      ADD CONSTRAINT sbt_claims_source_audit_id_fkey
      FOREIGN KEY (source_audit_id) REFERENCES public.audits(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sbt_claims_source_challenge_id_fkey'
  ) THEN
    ALTER TABLE public.sbt_claims
      ADD CONSTRAINT sbt_claims_source_challenge_id_fkey
      FOREIGN KEY (source_challenge_id) REFERENCES public.challenges(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audits_challenge_id_fkey'
  ) THEN
    ALTER TABLE public.audits
      ADD CONSTRAINT audits_challenge_id_fkey
      FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenges_audit_id_fkey'
  ) THEN
    ALTER TABLE public.challenges
      ADD CONSTRAINT challenges_audit_id_fkey
      FOREIGN KEY (audit_id) REFERENCES public.audits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6) Updated_at triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER set_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sbt_claims_updated_at ON public.sbt_claims;
CREATE TRIGGER set_sbt_claims_updated_at BEFORE UPDATE ON public.sbt_claims
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_audits_updated_at ON public.audits;
CREATE TRIGGER set_audits_updated_at BEFORE UPDATE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_challenges_updated_at ON public.challenges;
CREATE TRIGGER set_challenges_updated_at BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_collateral_accounts_updated_at ON public.collateral_accounts;
CREATE TRIGGER set_collateral_accounts_updated_at BEFORE UPDATE ON public.collateral_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_enforcement_actions_updated_at ON public.enforcement_actions;
CREATE TRIGGER set_enforcement_actions_updated_at BEFORE UPDATE ON public.enforcement_actions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7) SBT rule enforcement
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_sbt_claim_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trust_level = 'HIGH' THEN
    IF NOT (
      (NEW.issuer = 'AUDIT' AND NEW.source_audit_id IS NOT NULL)
      OR
      (NEW.issuer = 'CHALLENGE' AND NEW.source_challenge_id IS NOT NULL)
    ) THEN
      RAISE EXCEPTION 'HIGH trust requires AUDIT/CHALLENGE provenance';
    END IF;
  END IF;

  IF NEW.status = 'ACTIVE' AND NEW.issued_at IS NULL THEN
    NEW.issued_at := NOW();
  END IF;

  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN
    NEW.revoked_at := NOW();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_sbt_claim_rules ON public.sbt_claims;
CREATE TRIGGER trg_enforce_sbt_claim_rules
BEFORE INSERT OR UPDATE ON public.sbt_claims
FOR EACH ROW EXECUTE FUNCTION public.enforce_sbt_claim_rules();

-- -----------------------------------------------------------------------------
-- 8) Collateral RPCs (all ledger changes remain append-only via token_ledger)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_collateral_deposit(
  p_user_id UUID,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_ledger_id UUID;
  v_balance BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  BEGIN
    INSERT INTO public.token_ledger (
      user_id, amount, type, idempotency_key, meta
    ) VALUES (
      NULL,
      p_amount,
      'COLLATERAL_DEPOSIT',
      p_idempotency_key,
      COALESCE(p_meta, '{}'::jsonb)
        || jsonb_build_object('scope', 'COLLATERAL', 'collateral_user_id', p_user_id::text)
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT COALESCE(balance, 0) INTO v_balance FROM public.collateral_accounts WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'status', 'IDEMPOTENT_SKIPPED',
      'user_id', p_user_id,
      'balance', COALESCE(v_balance, 0),
      'ledger_id', null
    );
  END;

  INSERT INTO public.collateral_accounts (
    user_id, balance, total_deposited, last_ledger_id
  ) VALUES (
    p_user_id, p_amount, p_amount, v_ledger_id
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = public.collateral_accounts.balance + EXCLUDED.balance,
    total_deposited = public.collateral_accounts.total_deposited + EXCLUDED.total_deposited,
    last_ledger_id = EXCLUDED.last_ledger_id,
    updated_at = NOW()
  RETURNING balance INTO v_balance;

  RETURN jsonb_build_object(
    'status', 'DEPOSITED',
    'user_id', p_user_id,
    'balance', v_balance,
    'ledger_id', v_ledger_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.apply_collateral_refund(
  p_user_id UUID,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_ledger_id UUID;
  v_balance BIGINT;
  v_actual BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  SELECT balance INTO v_balance
  FROM public.collateral_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance <= 0 THEN
    RETURN jsonb_build_object('status', 'NO_COLLATERAL', 'user_id', p_user_id, 'balance', 0);
  END IF;

  v_actual := LEAST(v_balance, p_amount);

  BEGIN
    INSERT INTO public.token_ledger (
      user_id, amount, type, idempotency_key, meta
    ) VALUES (
      NULL,
      -v_actual,
      'COLLATERAL_REFUND',
      p_idempotency_key,
      COALESCE(p_meta, '{}'::jsonb)
        || jsonb_build_object('scope', 'COLLATERAL', 'collateral_user_id', p_user_id::text)
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'IDEMPOTENT_SKIPPED',
      'user_id', p_user_id,
      'balance', v_balance,
      'ledger_id', null
    );
  END;

  UPDATE public.collateral_accounts
  SET
    balance = balance - v_actual,
    total_refunded = total_refunded + v_actual,
    last_ledger_id = v_ledger_id,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  RETURN jsonb_build_object(
    'status', 'REFUNDED',
    'user_id', p_user_id,
    'refunded', v_actual,
    'balance', v_balance,
    'ledger_id', v_ledger_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.apply_collateral_slash(
  p_user_id UUID,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_ledger_id UUID;
  v_balance BIGINT;
  v_actual BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  SELECT balance INTO v_balance
  FROM public.collateral_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_balance <= 0 THEN
    RETURN jsonb_build_object('status', 'NO_COLLATERAL', 'user_id', p_user_id, 'balance', 0, 'actual_slashed', 0);
  END IF;

  v_actual := LEAST(v_balance, p_amount);

  BEGIN
    INSERT INTO public.token_ledger (
      user_id, amount, type, idempotency_key, meta
    ) VALUES (
      NULL,
      v_actual,
      'COLLATERAL_SLASH',
      p_idempotency_key,
      COALESCE(p_meta, '{}'::jsonb)
        || jsonb_build_object('scope', 'COLLATERAL', 'vault', 'INSURANCE', 'collateral_user_id', p_user_id::text)
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'IDEMPOTENT_SKIPPED',
      'user_id', p_user_id,
      'balance', v_balance,
      'actual_slashed', 0,
      'ledger_id', null
    );
  END;

  UPDATE public.collateral_accounts
  SET
    balance = balance - v_actual,
    total_slashed = total_slashed + v_actual,
    last_ledger_id = v_ledger_id,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  RETURN jsonb_build_object(
    'status', 'SLASHED',
    'user_id', p_user_id,
    'actual_slashed', v_actual,
    'balance', v_balance,
    'ledger_id', v_ledger_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.execute_enforcement_action(
  p_action_id UUID,
  p_executor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_action public.enforcement_actions%ROWTYPE;
  v_result JSONB := '{}'::jsonb;
  v_ledger_id UUID;
  v_idem TEXT;
BEGIN
  SELECT * INTO v_action
  FROM public.enforcement_actions
  WHERE id = p_action_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'NOT_FOUND', 'action_id', p_action_id);
  END IF;

  IF v_action.due_process_state = 'EXECUTED' THEN
    RETURN jsonb_build_object('status', 'ALREADY_EXECUTED', 'action_id', p_action_id, 'ledger_id', v_action.executed_ledger_id);
  END IF;

  IF v_action.due_process_state <> 'FINALIZED' THEN
    RETURN jsonb_build_object('status', 'DUE_PROCESS_NOT_FINALIZED', 'action_id', p_action_id, 'due_process_state', v_action.due_process_state);
  END IF;

  v_idem := COALESCE(v_action.idempotency_key, 'ENFORCEMENT:' || v_action.id::text);

  IF v_action.action_type IN ('SLASH', 'PENALTY') THEN
    v_result := public.apply_collateral_slash(
      v_action.target_user_id,
      GREATEST(v_action.amount, 0),
      v_idem,
      jsonb_build_object(
        'reason', COALESCE(v_action.reason, 'ENFORCEMENT'),
        'enforcement_action_id', v_action.id::text
      )
    );

    IF (v_result ? 'ledger_id') AND (v_result->>'ledger_id') IS NOT NULL THEN
      v_ledger_id := (v_result->>'ledger_id')::UUID;
    END IF;
  END IF;

  IF v_action.action_type = 'REVOKE_SBT' AND v_action.claim_id IS NOT NULL THEN
    UPDATE public.sbt_claims
    SET
      status = 'REVOKED',
      revoked_at = NOW(),
      updated_at = NOW()
    WHERE id = v_action.claim_id;
  END IF;

  UPDATE public.enforcement_actions
  SET
    due_process_state = 'EXECUTED',
    executed_at = NOW(),
    executed_ledger_id = COALESCE(v_ledger_id, executed_ledger_id),
    decision_by = COALESCE(p_executor_id, decision_by),
    updated_at = NOW()
  WHERE id = v_action.id;

  RETURN jsonb_build_object(
    'status', 'EXECUTED',
    'action_id', v_action.id,
    'action_type', v_action.action_type,
    'ledger_id', v_ledger_id,
    'result', v_result
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.apply_collateral_deposit(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_collateral_refund(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_collateral_slash(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_enforcement_action(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_collateral_deposit(UUID, BIGINT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_collateral_refund(UUID, BIGINT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_collateral_slash(UUID, BIGINT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_enforcement_action(UUID, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 9) RLS + Grants
-- -----------------------------------------------------------------------------
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbt_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collateral_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags read all authenticated" ON public.feature_flags;
CREATE POLICY "feature_flags read all authenticated" ON public.feature_flags
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "feature_flags no client write" ON public.feature_flags;
CREATE POLICY "feature_flags no client write" ON public.feature_flags
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "sbt_claims read own/admin" ON public.sbt_claims;
CREATE POLICY "sbt_claims read own/admin" ON public.sbt_claims
FOR SELECT USING (
  auth.uid() = user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

DROP POLICY IF EXISTS "sbt_claims no client write" ON public.sbt_claims;
CREATE POLICY "sbt_claims no client write" ON public.sbt_claims
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "audits read own/admin" ON public.audits;
CREATE POLICY "audits read own/admin" ON public.audits
FOR SELECT USING (
  auth.uid() = subject_user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

DROP POLICY IF EXISTS "audits no client write" ON public.audits;
CREATE POLICY "audits no client write" ON public.audits
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "challenges read own/admin" ON public.challenges;
CREATE POLICY "challenges read own/admin" ON public.challenges
FOR SELECT USING (
  auth.uid() = challenger_user_id
  OR auth.uid() = subject_user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

DROP POLICY IF EXISTS "challenges no client write" ON public.challenges;
CREATE POLICY "challenges no client write" ON public.challenges
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "collateral read own/admin" ON public.collateral_accounts;
CREATE POLICY "collateral read own/admin" ON public.collateral_accounts
FOR SELECT USING (
  auth.uid() = user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

DROP POLICY IF EXISTS "collateral no client write" ON public.collateral_accounts;
CREATE POLICY "collateral no client write" ON public.collateral_accounts
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "enforcement read own/admin" ON public.enforcement_actions;
CREATE POLICY "enforcement read own/admin" ON public.enforcement_actions
FOR SELECT USING (
  auth.uid() = target_user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

DROP POLICY IF EXISTS "enforcement no client write" ON public.enforcement_actions;
CREATE POLICY "enforcement no client write" ON public.enforcement_actions
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.feature_flags FROM anon, authenticated;
REVOKE ALL ON TABLE public.sbt_claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.audits FROM anon, authenticated;
REVOKE ALL ON TABLE public.challenges FROM anon, authenticated;
REVOKE ALL ON TABLE public.collateral_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.enforcement_actions FROM anon, authenticated;

GRANT SELECT ON TABLE public.feature_flags TO authenticated;
GRANT SELECT ON TABLE public.sbt_claims TO authenticated;
GRANT SELECT ON TABLE public.audits TO authenticated;
GRANT SELECT ON TABLE public.challenges TO authenticated;
GRANT SELECT ON TABLE public.collateral_accounts TO authenticated;
GRANT SELECT ON TABLE public.enforcement_actions TO authenticated;

GRANT ALL ON TABLE public.feature_flags TO service_role;
GRANT ALL ON TABLE public.sbt_claims TO service_role;
GRANT ALL ON TABLE public.audits TO service_role;
GRANT ALL ON TABLE public.challenges TO service_role;
GRANT ALL ON TABLE public.collateral_accounts TO service_role;
GRANT ALL ON TABLE public.enforcement_actions TO service_role;

-- -----------------------------------------------------------------------------
-- 10) Audit triggers for anchor inclusion
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_feature_flags_trigger ON public.feature_flags;
CREATE TRIGGER audit_feature_flags_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_sbt_claims_trigger ON public.sbt_claims;
CREATE TRIGGER audit_sbt_claims_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sbt_claims
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_audits_trigger ON public.audits;
CREATE TRIGGER audit_audits_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_challenges_trigger ON public.challenges;
CREATE TRIGGER audit_challenges_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_collateral_accounts_trigger ON public.collateral_accounts;
CREATE TRIGGER audit_collateral_accounts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.collateral_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_enforcement_actions_trigger ON public.enforcement_actions;
CREATE TRIGGER audit_enforcement_actions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.enforcement_actions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
