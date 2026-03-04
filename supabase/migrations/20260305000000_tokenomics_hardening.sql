-- =============================================================================
-- SoulBound MVP - Tokenomics Hardening
-- - treasury_budgets runtime enforcement (RPC)
-- - atomic airdrop claim RPC
-- - audit logging restoration for non-UUID PK tables
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) soul_airdrop_claims schema normalization for mixed legacy/new environments
-- -----------------------------------------------------------------------------
ALTER TABLE public.soul_airdrop_claims ADD COLUMN IF NOT EXISTS cohort TEXT;
ALTER TABLE public.soul_airdrop_claims ADD COLUMN IF NOT EXISTS amount BIGINT;
ALTER TABLE public.soul_airdrop_claims ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.soul_airdrop_claims ADD COLUMN IF NOT EXISTS airdrop_amount BIGINT;
ALTER TABLE public.soul_airdrop_claims ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

UPDATE public.soul_airdrop_claims
SET
  cohort = COALESCE(cohort, 'LEGACY'),
  amount = COALESCE(amount, airdrop_amount, 0),
  airdrop_amount = COALESCE(airdrop_amount, amount, 0),
  claimed_at = COALESCE(claimed_at, verified_at, NOW());

ALTER TABLE public.soul_airdrop_claims ALTER COLUMN cohort SET DEFAULT 'LEGACY';
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN amount SET DEFAULT 0;
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN airdrop_amount SET DEFAULT 0;
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN claimed_at SET DEFAULT NOW();

ALTER TABLE public.soul_airdrop_claims ALTER COLUMN cohort SET NOT NULL;
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN amount SET NOT NULL;
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN airdrop_amount SET NOT NULL;
ALTER TABLE public.soul_airdrop_claims ALTER COLUMN claimed_at SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 1) deterministic UUID helper for non-UUID primary keys in audit_logs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.uuid_from_text(p_input TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(COALESCE(p_input, '')), 1, 8) || '-' ||
    substr(md5(COALESCE(p_input, '')), 9, 4) || '-4' ||
    substr(md5(COALESCE(p_input, '')), 14, 3) || '-8' ||
    substr(md5(COALESCE(p_input, '')), 18, 3) || '-' ||
    substr(md5(COALESCE(p_input, '')), 21, 12)
  )::uuid;
$$;

-- -----------------------------------------------------------------------------
-- 2) generic audit trigger for tables that don't have UUID id columns
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event_flexible()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  key_col TEXT := COALESCE(TG_ARGV[0], 'id');
  key_value TEXT;
  old_record JSONB := NULL;
  new_record JSONB := NULL;
  user_id UUID := auth.uid();
  record_uuid UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_record := row_to_json(OLD)::JSONB;
    key_value := COALESCE(old_record ->> key_col, '[null]');
    old_record := old_record || jsonb_build_object('_record_key_col', key_col, '_record_key', key_value);
    record_uuid := public.uuid_from_text(TG_TABLE_NAME || ':' || key_col || ':' || key_value);

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, record_uuid, 'DELETE', old_record, user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_record := row_to_json(OLD)::JSONB;
    new_record := row_to_json(NEW)::JSONB;
    key_value := COALESCE(new_record ->> key_col, old_record ->> key_col, '[null]');
    old_record := old_record || jsonb_build_object('_record_key_col', key_col, '_record_key', key_value);
    new_record := new_record || jsonb_build_object('_record_key_col', key_col, '_record_key', key_value);
    record_uuid := public.uuid_from_text(TG_TABLE_NAME || ':' || key_col || ':' || key_value);

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, record_uuid, 'UPDATE', old_record, new_record, user_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_record := row_to_json(NEW)::JSONB;
    key_value := COALESCE(new_record ->> key_col, '[null]');
    new_record := new_record || jsonb_build_object('_record_key_col', key_col, '_record_key', key_value);
    record_uuid := public.uuid_from_text(TG_TABLE_NAME || ':' || key_col || ':' || key_value);

    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, record_uuid, 'INSERT', new_record, user_id);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_treasury_wallet_trigger ON public.treasury_wallet;
DROP TRIGGER IF EXISTS audit_user_wallets_trigger ON public.user_wallets;
DROP TRIGGER IF EXISTS audit_soul_airdrop_claims_trigger ON public.soul_airdrop_claims;
DROP TRIGGER IF EXISTS audit_treasury_vaults_flexible_trigger ON public.treasury_vaults;
DROP TRIGGER IF EXISTS audit_economy_config_flexible_trigger ON public.economy_config;

CREATE TRIGGER audit_treasury_wallet_flexible_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.treasury_wallet
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('id');

CREATE TRIGGER audit_user_wallets_flexible_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('user_id');

CREATE TRIGGER audit_soul_airdrop_claims_flexible_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.soul_airdrop_claims
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('user_id');

CREATE TRIGGER audit_treasury_vaults_flexible_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.treasury_vaults
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('vault');

CREATE TRIGGER audit_economy_config_flexible_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.economy_config
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('id');

-- -----------------------------------------------------------------------------
-- 3) budget-enforced treasury spend RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.treasury_spend_with_budget(
  p_vault public.soul_vault_type,
  p_amount BIGINT,
  p_related_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_budget public.treasury_budgets%ROWTYPE;
  v_ledger_id UUID;
  v_idem TEXT;
BEGIN
  IF p_vault IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'BAD_REQUEST',
      'message', 'vault and amount(>0) are required'
    );
  END IF;

  v_idem := COALESCE(
    NULLIF(trim(p_idempotency_key), ''),
    'TREASURY_SPEND:' || p_vault::TEXT || ':' || to_char(NOW(), 'YYYYMMDDHH24MISSMS')
  );

  SELECT *
    INTO v_budget
  FROM public.treasury_budgets
  WHERE vault = p_vault
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE
  ORDER BY period_start DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'BUDGET_NOT_FOUND',
      'vault', p_vault::TEXT
    );
  END IF;

  IF (v_budget.outflow_used + p_amount) > v_budget.max_outflow THEN
    RETURN jsonb_build_object(
      'status', 'BUDGET_EXCEEDED',
      'vault', p_vault::TEXT,
      'budget_id', v_budget.id,
      'max_outflow', v_budget.max_outflow,
      'outflow_used', v_budget.outflow_used,
      'requested', p_amount
    );
  END IF;

  BEGIN
    INSERT INTO public.token_ledger (
      user_id, amount, type, related_id, idempotency_key, meta
    )
    VALUES (
      NULL,
      -p_amount,
      'TREASURY_SPEND',
      p_related_id,
      v_idem,
      COALESCE(p_meta, '{}'::jsonb)
        || jsonb_build_object('scope', 'TREASURY_SPEND', 'vault', p_vault::TEXT)
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id
      INTO v_ledger_id
    FROM public.token_ledger
    WHERE idempotency_key = v_idem
    LIMIT 1;

    RETURN jsonb_build_object(
      'status', 'IDEMPOTENT_SKIPPED',
      'vault', p_vault::TEXT,
      'ledger_id', v_ledger_id
    );
  END;

  UPDATE public.treasury_budgets
  SET
    outflow_used = outflow_used + p_amount
  WHERE id = v_budget.id;

  RETURN jsonb_build_object(
    'status', 'SPENT',
    'vault', p_vault::TEXT,
    'amount', p_amount,
    'budget_id', v_budget.id,
    'outflow_used', v_budget.outflow_used + p_amount,
    'max_outflow', v_budget.max_outflow,
    'ledger_id', v_ledger_id
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) atomic airdrop claim RPC (anti-farming claim_no tiering)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_soul_airdrop(
  p_user_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_claim_no BIGINT;
  v_amount BIGINT;
  v_cohort TEXT;
  v_idem TEXT;
  v_ledger_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'BAD_REQUEST', 'message', 'user_id required');
  END IF;

  v_idem := COALESCE(NULLIF(trim(p_idempotency_key), ''), 'AIRDROP:' || p_user_id::TEXT);

  BEGIN
    INSERT INTO public.soul_airdrop_claims (
      user_id, cohort, amount, airdrop_amount, claimed_at, idempotency_key
    )
    VALUES (
      p_user_id, 'PENDING', 0, 0, NOW(), v_idem
    )
    RETURNING claim_no INTO v_claim_no;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_CLAIMED',
      'user_id', p_user_id
    );
  END;

  IF v_claim_no <= 100 THEN
    v_amount := 80;
    v_cohort := 'TOP100';
  ELSIF v_claim_no <= 1000 THEN
    v_amount := 50;
    v_cohort := 'TOP1000';
  ELSE
    v_amount := 20;
    v_cohort := 'BASE';
  END IF;

  UPDATE public.soul_airdrop_claims
  SET
    cohort = v_cohort,
    amount = v_amount,
    airdrop_amount = v_amount,
    claimed_at = NOW()
  WHERE user_id = p_user_id;

  BEGIN
    INSERT INTO public.token_ledger (
      user_id, amount, type, idempotency_key, meta
    )
    VALUES (
      p_user_id,
      v_amount,
      'AIRDROP',
      v_idem,
      jsonb_build_object(
        'scope', 'AIRDROP',
        'claim_no', v_claim_no,
        'cohort', v_cohort
      )
    )
    RETURNING id INTO v_ledger_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id
      INTO v_ledger_id
    FROM public.token_ledger
    WHERE idempotency_key = v_idem
    LIMIT 1;
  END;

  RETURN jsonb_build_object(
    'status', 'CLAIMED',
    'user_id', p_user_id,
    'claim_no', v_claim_no,
    'cohort', v_cohort,
    'amount', v_amount,
    'ledger_id', v_ledger_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.treasury_spend_with_budget(public.soul_vault_type, BIGINT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_soul_airdrop(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.treasury_spend_with_budget(public.soul_vault_type, BIGINT, UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_soul_airdrop(UUID, TEXT) TO service_role;

COMMIT;

