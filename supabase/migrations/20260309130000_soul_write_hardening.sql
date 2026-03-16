-- =============================================================================
-- SOUL write-path hardening
-- - remove direct service-role ledger inserts
-- - introduce internal ledger append RPC
-- - enforce wallet projection-only writes
-- - add ledger-wallet consistency view + reconcile RPC
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Canonical internal ledger append path (service_role only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_soul_ledger_internal(
  p_user_id UUID,
  p_amount BIGINT,
  p_type public.soul_tx_type,
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
  v_ledger_id UUID;
  v_idem TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('status', 'BAD_REQUEST', 'message', 'amount must be non-zero');
  END IF;

  IF p_type IS NULL THEN
    RETURN jsonb_build_object('status', 'BAD_REQUEST', 'message', 'type is required');
  END IF;

  -- Official public flows must use dedicated RPCs.
  IF p_type IN ('AIRDROP', 'TREASURY_SPEND') THEN
    RETURN jsonb_build_object(
      'status', 'FORBIDDEN_TYPE',
      'message', 'Use official claim_soul_airdrop or treasury_spend_with_budget path for this type',
      'type', p_type::TEXT
    );
  END IF;

  v_idem := COALESCE(
    NULLIF(trim(p_idempotency_key), ''),
    'INTERNAL:' || p_type::TEXT || ':' || COALESCE(p_user_id::TEXT, 'TREASURY') || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMSUS')
  );

  BEGIN
    INSERT INTO public.token_ledger (
      user_id,
      amount,
      type,
      related_id,
      idempotency_key,
      meta
    )
    VALUES (
      p_user_id,
      p_amount,
      p_type,
      p_related_id,
      v_idem,
      COALESCE(p_meta, '{}'::jsonb) || jsonb_build_object('write_path', 'INTERNAL_RPC')
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
      'ledger_id', v_ledger_id,
      'idempotency_key', v_idem
    );
  END;

  RETURN jsonb_build_object(
    'status', 'INSERTED',
    'ledger_id', v_ledger_id,
    'idempotency_key', v_idem
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.append_soul_ledger_internal(UUID, BIGINT, public.soul_tx_type, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_soul_ledger_internal(UUID, BIGINT, public.soul_tx_type, UUID, TEXT, JSONB) TO service_role;

-- Remove direct service-role writes to token_ledger.
REVOKE INSERT ON TABLE public.token_ledger FROM service_role;

-- -----------------------------------------------------------------------------
-- 2) user_wallets projection-only enforcement
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_wallets_projection_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_source TEXT := current_setting('app.user_wallets_write_source', true);
BEGIN
  IF v_source IN ('LEDGER_SYNC', 'RECONCILE') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'user_wallets is projection-only; mutate token_ledger or use reconcile_user_wallet_balance()';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_wallets_projection_write ON public.user_wallets;
CREATE TRIGGER trg_guard_user_wallets_projection_write
BEFORE INSERT OR UPDATE OR DELETE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_user_wallets_projection_write();

CREATE OR REPLACE FUNCTION public.sync_user_wallet_on_ledger_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.user_wallets_write_source', 'LEDGER_SYNC', true);

  INSERT INTO public.user_wallets(user_id, balance, updated_at)
  VALUES (NEW.user_id, NEW.amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = public.user_wallets.balance + EXCLUDED.balance,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Ledger-wallet consistency checks and repair path
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_wallet_balance_audit AS
WITH ledger_sums AS (
  SELECT
    user_id,
    COALESCE(SUM(amount), 0)::BIGINT AS ledger_sum
  FROM public.token_ledger
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
wallet_rows AS (
  SELECT user_id, balance AS wallet_balance
  FROM public.user_wallets
)
SELECT
  COALESCE(l.user_id, w.user_id) AS user_id,
  COALESCE(l.ledger_sum, 0)::BIGINT AS ledger_sum,
  COALESCE(w.wallet_balance, 0)::BIGINT AS wallet_balance,
  (COALESCE(w.wallet_balance, 0) - COALESCE(l.ledger_sum, 0))::BIGINT AS diff
FROM ledger_sums l
FULL OUTER JOIN wallet_rows w USING (user_id);

CREATE OR REPLACE FUNCTION public.reconcile_user_wallet_balance(
  p_user_id UUID DEFAULT NULL,
  p_apply BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_before BIGINT := 0;
  v_after BIGINT := 0;
  v_updated BIGINT := 0;
BEGIN
  SELECT COUNT(*)::BIGINT
    INTO v_before
  FROM public.user_wallet_balance_audit
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND diff <> 0;

  IF NOT p_apply THEN
    RETURN jsonb_build_object(
      'mode', 'DRY_RUN',
      'scope_user_id', p_user_id,
      'mismatch_count', v_before
    );
  END IF;

  PERFORM set_config('app.user_wallets_write_source', 'RECONCILE', true);

  WITH target_users AS (
    SELECT user_id FROM public.user_wallets
    UNION
    SELECT user_id FROM public.token_ledger WHERE user_id IS NOT NULL
  ),
  target_balances AS (
    SELECT
      tu.user_id,
      COALESCE(SUM(tl.amount), 0)::BIGINT AS ledger_sum
    FROM target_users tu
    LEFT JOIN public.token_ledger tl
      ON tl.user_id = tu.user_id
    WHERE p_user_id IS NULL OR tu.user_id = p_user_id
    GROUP BY tu.user_id
  )
  INSERT INTO public.user_wallets(user_id, balance, updated_at)
  SELECT user_id, ledger_sum, NOW()
  FROM target_balances
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    updated_at = NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COUNT(*)::BIGINT
    INTO v_after
  FROM public.user_wallet_balance_audit
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND diff <> 0;

  RETURN jsonb_build_object(
    'mode', 'APPLY',
    'scope_user_id', p_user_id,
    'mismatch_before', v_before,
    'rows_upserted', v_updated,
    'mismatch_after', v_after
  );
END;
$$;

GRANT SELECT ON public.user_wallet_balance_audit TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.reconcile_user_wallet_balance(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_user_wallet_balance(UUID, BOOLEAN) TO service_role;

COMMIT;
