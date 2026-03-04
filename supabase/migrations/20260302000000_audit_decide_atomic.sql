-- =============================================================================
-- SoulBound MVP - Atomic DECIDE flow for audit pass/fail
-- Ensures multi-table writes in /api/audit/decide are committed atomically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.decide_audit_atomic(
  p_audit_id UUID,
  p_decision TEXT,
  p_slash_amount BIGINT DEFAULT 0,
  p_note TEXT DEFAULT NULL,
  p_decision_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_audit public.audits%ROWTYPE;
  v_claim public.sbt_claims%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_decision TEXT := UPPER(TRIM(COALESCE(p_decision, '')));
  v_slash_amount BIGINT := GREATEST(COALESCE(p_slash_amount, 0), 0);
  v_high_trust_collateral_required BOOLEAN := false;
  v_collateral_balance BIGINT := 0;
  v_slash_action public.enforcement_actions%ROWTYPE;
  v_revoke_action public.enforcement_actions%ROWTYPE;
BEGIN
  IF p_audit_id IS NULL OR v_decision NOT IN ('PASS', 'FAIL') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'audit_id and decision(PASS|FAIL) are required'
    );
  END IF;

  SELECT *
    INTO v_audit
  FROM public.audits
  WHERE id = p_audit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'AUDIT_NOT_FOUND');
  END IF;

  IF v_audit.state IN ('RESOLVED_PASS', 'RESOLVED_FAIL', 'CLOSED') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'AUDIT_ALREADY_DECIDED',
      'audit_id', v_audit.id,
      'state', v_audit.state
    );
  END IF;

  SELECT *
    INTO v_claim
  FROM public.sbt_claims
  WHERE id = v_audit.claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CLAIM_NOT_FOUND');
  END IF;

  UPDATE public.audits
  SET
    state = CASE WHEN v_decision = 'PASS' THEN 'RESOLVED_PASS'::public.sbt_audit_state ELSE 'RESOLVED_FAIL'::public.sbt_audit_state END,
    decided_at = v_now,
    decision_by = p_decision_by,
    notes = COALESCE(p_note, notes),
    updated_at = v_now
  WHERE id = v_audit.id;

  UPDATE public.enforcement_actions
  SET
    due_process_state = 'FINALIZED',
    finalized_at = v_now,
    decision_by = COALESCE(p_decision_by, decision_by),
    updated_at = v_now
  WHERE audit_id = v_audit.id
    AND action_type = 'FREEZE'
    AND due_process_state IN ('NOTIFIED', 'RESPONDED');

  IF v_decision = 'PASS' THEN
    SELECT COALESCE(ff.enabled, false)
      INTO v_high_trust_collateral_required
    FROM public.feature_flags ff
    WHERE ff.flag_key = 'COLLATERAL_REQUIRED_FOR_HIGH_TRUST'
    LIMIT 1;

    IF v_high_trust_collateral_required THEN
      SELECT COALESCE(ca.balance, 0)
        INTO v_collateral_balance
      FROM public.collateral_accounts ca
      WHERE ca.user_id = v_claim.user_id
      FOR UPDATE;
    END IF;

    IF v_high_trust_collateral_required AND v_collateral_balance <= 0 THEN
      UPDATE public.sbt_claims
      SET
        status = 'FROZEN',
        updated_at = v_now
      WHERE id = v_claim.id;

      RETURN jsonb_build_object(
        'ok', false,
        'error', 'COLLATERAL_REQUIRED_FOR_HIGH_TRUST',
        'audit_id', v_audit.id,
        'claim_id', v_claim.id,
        'collateral_balance', v_collateral_balance
      );
    END IF;

    UPDATE public.sbt_claims
    SET
      trust_level = 'HIGH',
      status = 'ACTIVE',
      issuer = CASE WHEN v_audit.audit_type = 'CHALLENGE' THEN 'CHALLENGE'::public.sbt_issuer ELSE 'AUDIT'::public.sbt_issuer END,
      source_audit_id = v_audit.id,
      source_challenge_id = v_audit.challenge_id,
      issued_at = v_now,
      updated_at = v_now
    WHERE id = v_claim.id;

    UPDATE public.profiles
    SET
      is_frozen = false,
      freeze_reason = NULL,
      freeze_updated_at = v_now,
      updated_at = v_now
    WHERE id = v_audit.subject_user_id;

    UPDATE public.enforcement_actions
    SET
      due_process_state = 'EXECUTED',
      executed_at = v_now,
      decision_by = COALESCE(p_decision_by, decision_by),
      updated_at = v_now
    WHERE audit_id = v_audit.id
      AND action_type = 'FREEZE'
      AND due_process_state = 'FINALIZED';

    IF v_audit.challenge_id IS NOT NULL THEN
      UPDATE public.challenges
      SET
        state = 'RESOLVED_FAIL',
        closed_at = v_now,
        updated_at = v_now
      WHERE id = v_audit.challenge_id;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'audit_id', v_audit.id,
      'decision', 'PASS',
      'claim_status', 'ACTIVE',
      'trust_level', 'HIGH'
    );
  END IF;

  UPDATE public.sbt_claims
  SET
    status = 'DISHONORED',
    updated_at = v_now
  WHERE id = v_claim.id;

  UPDATE public.profiles
  SET
    is_frozen = true,
    freeze_reason = 'Audit failed - enforcement pending/executing',
    freeze_updated_at = v_now,
    updated_at = v_now
  WHERE id = v_audit.subject_user_id;

  IF v_audit.challenge_id IS NOT NULL THEN
    UPDATE public.challenges
    SET
      state = 'RESOLVED_PASS',
      closed_at = v_now,
      updated_at = v_now
    WHERE id = v_audit.challenge_id;
  END IF;

  INSERT INTO public.enforcement_actions (
    target_user_id,
    claim_id,
    audit_id,
    challenge_id,
    action_type,
    amount,
    due_process_state,
    reason,
    notified_at,
    finalized_at,
    decision_by,
    idempotency_key
  )
  VALUES (
    v_audit.subject_user_id,
    v_claim.id,
    v_audit.id,
    v_audit.challenge_id,
    'SLASH',
    v_slash_amount,
    'FINALIZED',
    COALESCE(p_note, 'Audit failed; collateral slash'),
    v_now,
    v_now,
    p_decision_by,
    'SLASH_AUDIT:' || v_audit.id::text
  )
  ON CONFLICT (idempotency_key)
  DO UPDATE
    SET updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_slash_action;

  INSERT INTO public.enforcement_actions (
    target_user_id,
    claim_id,
    audit_id,
    challenge_id,
    action_type,
    amount,
    due_process_state,
    reason,
    notified_at,
    finalized_at,
    decision_by,
    idempotency_key
  )
  VALUES (
    v_audit.subject_user_id,
    v_claim.id,
    v_audit.id,
    v_audit.challenge_id,
    'REVOKE_SBT',
    0,
    'FINALIZED',
    COALESCE(p_note, 'Audit failed; claim must be revoked'),
    v_now,
    v_now,
    p_decision_by,
    'REVOKE_AUDIT:' || v_audit.id::text
  )
  ON CONFLICT (idempotency_key)
  DO UPDATE
    SET updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_revoke_action;

  RETURN jsonb_build_object(
    'ok', true,
    'audit_id', v_audit.id,
    'decision', 'FAIL',
    'claim_status', 'DISHONORED',
    'queued_enforcement', jsonb_build_object(
      'slash_action', jsonb_build_object(
        'id', v_slash_action.id,
        'amount', v_slash_action.amount,
        'due_process_state', v_slash_action.due_process_state
      ),
      'revoke_action', jsonb_build_object(
        'id', v_revoke_action.id,
        'due_process_state', v_revoke_action.due_process_state
      )
    )
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.decide_audit_atomic(UUID, TEXT, BIGINT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_audit_atomic(UUID, TEXT, BIGINT, TEXT, UUID) TO service_role;
