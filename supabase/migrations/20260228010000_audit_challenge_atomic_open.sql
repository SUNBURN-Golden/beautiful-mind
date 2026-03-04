-- =============================================================================
-- SoulBound MVP - Atomic OPEN flow for RANDOM audit / CHALLENGE audit
-- Ensures Freeze-related multi-write flow is transactionally consistent.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.open_random_audit_and_freeze(
  p_subject_user_id UUID,
  p_claim_id UUID,
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
  v_claim public.sbt_claims%ROWTYPE;
  v_open_audit_id UUID;
  v_audit_id UUID;
  v_freeze_action_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_subject_user_id IS NULL OR p_claim_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'subject_user_id and claim_id are required'
    );
  END IF;

  SELECT *
    INTO v_claim
  FROM public.sbt_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CLAIM_NOT_FOUND');
  END IF;

  IF v_claim.user_id <> p_subject_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'claim_id does not belong to subject_user_id'
    );
  END IF;

  IF v_claim.status = 'REVOKED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'CLAIM_REVOKED',
      'message', 'Cannot audit a revoked claim'
    );
  END IF;

  SELECT a.id
    INTO v_open_audit_id
  FROM public.audits a
  WHERE a.claim_id = p_claim_id
    AND a.state IN ('OPEN', 'FROZEN', 'UNDER_REVIEW')
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF v_open_audit_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'AUDIT_ALREADY_OPEN',
      'audit_id', v_open_audit_id
    );
  END IF;

  INSERT INTO public.audits (
    audit_type,
    subject_user_id,
    claim_id,
    state,
    opened_at,
    notes
  )
  VALUES (
    'RANDOM',
    p_subject_user_id,
    p_claim_id,
    'FROZEN',
    v_now,
    COALESCE(p_note, 'Random audit opened')
  )
  RETURNING id INTO v_audit_id;

  UPDATE public.sbt_claims
  SET
    status = 'FROZEN',
    updated_at = v_now
  WHERE id = p_claim_id;

  UPDATE public.profiles
  SET
    is_frozen = true,
    freeze_reason = 'Random audit opened - due process pending',
    freeze_updated_at = v_now,
    updated_at = v_now
  WHERE id = p_subject_user_id;

  INSERT INTO public.enforcement_actions (
    target_user_id,
    claim_id,
    audit_id,
    action_type,
    amount,
    due_process_state,
    reason,
    notified_at,
    decision_by,
    idempotency_key
  )
  VALUES (
    p_subject_user_id,
    p_claim_id,
    v_audit_id,
    'FREEZE',
    0,
    'NOTIFIED',
    'Random audit opened; account frozen pending review',
    v_now,
    p_decision_by,
    'FREEZE_RANDOM_AUDIT:' || v_audit_id::text
  )
  RETURNING id INTO v_freeze_action_id;

  RETURN jsonb_build_object(
    'ok', true,
    'audit_id', v_audit_id,
    'freeze_action_id', v_freeze_action_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.open_challenge_audit_and_freeze(
  p_challenger_user_id UUID,
  p_subject_user_id UUID,
  p_claim_id UUID,
  p_evidence_ref TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_claim public.sbt_claims%ROWTYPE;
  v_open_audit_id UUID;
  v_challenge_id UUID;
  v_audit_id UUID;
  v_freeze_action_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_challenger_user_id IS NULL OR p_subject_user_id IS NULL OR p_claim_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'challenger_user_id, subject_user_id, claim_id are required'
    );
  END IF;

  IF p_evidence_ref IS NULL OR length(trim(p_evidence_ref)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'evidence_ref is required'
    );
  END IF;

  IF p_challenger_user_id = p_subject_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'SELF_CHALLENGE',
      'message', 'Self-challenge is not allowed'
    );
  END IF;

  SELECT *
    INTO v_claim
  FROM public.sbt_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CLAIM_NOT_FOUND');
  END IF;

  IF v_claim.user_id <> p_subject_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'BAD_REQUEST',
      'message', 'claim_id does not belong to subject_user_id'
    );
  END IF;

  IF v_claim.status = 'REVOKED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'CLAIM_REVOKED',
      'message', 'Cannot challenge a revoked claim'
    );
  END IF;

  SELECT a.id
    INTO v_open_audit_id
  FROM public.audits a
  WHERE a.claim_id = p_claim_id
    AND a.state IN ('OPEN', 'FROZEN', 'UNDER_REVIEW')
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF v_open_audit_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'AUDIT_ALREADY_OPEN',
      'audit_id', v_open_audit_id
    );
  END IF;

  INSERT INTO public.challenges (
    challenger_user_id,
    subject_user_id,
    claim_id,
    evidence_ref,
    state,
    opened_at
  )
  VALUES (
    p_challenger_user_id,
    p_subject_user_id,
    p_claim_id,
    trim(p_evidence_ref),
    'OPEN',
    v_now
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.audits (
    audit_type,
    subject_user_id,
    claim_id,
    challenge_id,
    state,
    opened_at,
    notes
  )
  VALUES (
    'CHALLENGE',
    p_subject_user_id,
    p_claim_id,
    v_challenge_id,
    'FROZEN',
    v_now,
    COALESCE(p_note, 'Challenge-triggered audit')
  )
  RETURNING id INTO v_audit_id;

  UPDATE public.challenges
  SET
    audit_id = v_audit_id,
    state = 'LINKED_TO_AUDIT',
    updated_at = v_now
  WHERE id = v_challenge_id;

  UPDATE public.sbt_claims
  SET
    status = 'FROZEN',
    updated_at = v_now
  WHERE id = p_claim_id;

  UPDATE public.profiles
  SET
    is_frozen = true,
    freeze_reason = 'Challenge opened - due process pending',
    freeze_updated_at = v_now,
    updated_at = v_now
  WHERE id = p_subject_user_id;

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
    idempotency_key
  )
  VALUES (
    p_subject_user_id,
    p_claim_id,
    v_audit_id,
    v_challenge_id,
    'FREEZE',
    0,
    'NOTIFIED',
    'Challenge opened; account frozen pending review',
    v_now,
    'FREEZE_CHALLENGE:' || v_challenge_id::text
  )
  RETURNING id INTO v_freeze_action_id;

  RETURN jsonb_build_object(
    'ok', true,
    'challenge_id', v_challenge_id,
    'audit_id', v_audit_id,
    'freeze_action_id', v_freeze_action_id
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.open_random_audit_and_freeze(UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.open_challenge_audit_and_freeze(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_random_audit_and_freeze(UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.open_challenge_audit_and_freeze(UUID, UUID, UUID, TEXT, TEXT) TO service_role;
