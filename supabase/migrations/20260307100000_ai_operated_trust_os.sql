-- =============================================================================
-- SoulBound AI-Operated Trust OS
-- Remove human review from hot path; keep human only for appeal/exception/audit.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Enum extensions and new enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.admission_application_status ADD VALUE IF NOT EXISTS 'EXCEPTION_REQUIRED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_application_status ADD VALUE IF NOT EXISTS 'APPEAL_PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_application_status ADD VALUE IF NOT EXISTS 'AUDIT_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'AI_DECISION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'RESUBMIT_REQUIRED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'REJECTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'EXCEPTION_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'APPEAL_PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.admission_step ADD VALUE IF NOT EXISTS 'AUDIT_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_decision_type AS ENUM (
    'APPROVE',
    'REJECT',
    'RESUBMIT_REQUIRED',
    'EXCEPTION_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.appeal_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED_UPHELD',
    'RESOLVED_OVERTURNED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.exception_case_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED_APPROVE',
    'RESOLVED_REJECT',
    'RESOLVED_RESUBMIT',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_sample_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_sample_outcome AS ENUM (
    'CONFIRMED',
    'OVERTURNED',
    'POLICY_GAP',
    'MODEL_DRIFT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.policy_proposal_status AS ENUM (
    'DRAFT',
    'SIMULATED',
    'APPROVED',
    'REJECTED',
    'ROLLED_OUT',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Decision, cold-path, and ops tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admission_decision_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_type public.admission_decision_type NOT NULL,
  ai_model_name TEXT NOT NULL DEFAULT 'heuristic-v1',
  ai_model_version TEXT NOT NULL DEFAULT '2026-03',
  policy_version TEXT NOT NULL DEFAULT 'admission-v2-ai-os',
  input_snapshot_hash TEXT NOT NULL,
  rule_results_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_decision public.admission_decision_type NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  anomaly_flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_reason_code TEXT,
  execution_mode TEXT NOT NULL DEFAULT 'HOT_PATH',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admission_decision_runs_user_idx
ON public.admission_decision_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admission_decision_runs_app_idx
ON public.admission_decision_runs(admission_application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admission_decision_runs_final_idx
ON public.admission_decision_runs(final_decision, created_at DESC);

CREATE TABLE IF NOT EXISTS public.policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  description TEXT,
  rule_value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rollout_stage TEXT NOT NULL DEFAULT 'ACTIVE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.policy_rules(rule_key, description, rule_value_json)
VALUES
  ('admission.ai_confidence_floor', 'Minimum confidence required for auto approve.', '{"value":0.68}'::jsonb),
  ('admission.exception_confidence_floor', 'Below this confidence and above hard reject, route to exception queue.', '{"value":0.45}'::jsonb),
  ('admission.hard_reject_confidence_ceiling', 'Equal or below this confidence with reject signals leads to auto reject.', '{"value":0.20}'::jsonb),
  ('admission.audit_sample_rate', 'Random sample rate applied to approved/rejected decisions.', '{"value":0.05}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  source_decision_run_id UUID REFERENCES public.admission_decision_runs(id) ON DELETE SET NULL,
  status public.appeal_status NOT NULL DEFAULT 'OPEN',
  appeal_reason_text TEXT NOT NULL,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_type TEXT,
  resolution_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appeals_user_idx ON public.appeals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appeals_status_idx ON public.appeals(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS appeals_single_open_per_application
ON public.appeals(admission_application_id)
WHERE status IN ('OPEN', 'UNDER_REVIEW');

CREATE TABLE IF NOT EXISTS public.exception_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_decision_run_id UUID REFERENCES public.admission_decision_runs(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  anomaly_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.exception_case_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exception_cases_status_idx
ON public.exception_cases(status, created_at DESC);

CREATE INDEX IF NOT EXISTS exception_cases_user_idx
ON public.exception_cases(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_decision_run_id UUID REFERENCES public.admission_decision_runs(id) ON DELETE SET NULL,
  sample_reason TEXT NOT NULL,
  status public.audit_sample_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  outcome public.audit_sample_outcome,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS audit_samples_status_idx
ON public.audit_samples(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admission_ops_metrics_daily (
  day DATE PRIMARY KEY,
  started_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  resubmit_count INTEGER NOT NULL DEFAULT 0,
  exception_count INTEGER NOT NULL DEFAULT 0,
  avg_decision_latency_ms NUMERIC(12,2) NOT NULL DEFAULT 0,
  purge_failure_count INTEGER NOT NULL DEFAULT 0,
  low_confidence_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  ai_approval_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  appeal_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  appeal_overturn_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admission_ops_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day DATE NOT NULL,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS admission_ops_anomalies_day_type_idx
ON public.admission_ops_anomalies(day, anomaly_type);

CREATE TABLE IF NOT EXISTS public.policy_change_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_type TEXT NOT NULL,
  target_rule TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB,
  rationale_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  based_on_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  simulation_result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.policy_proposal_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS policy_change_proposals_status_idx
ON public.policy_change_proposals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.policy_shadow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.policy_change_proposals(id) ON DELETE CASCADE,
  decision_run_id UUID NOT NULL REFERENCES public.admission_decision_runs(id) ON DELETE CASCADE,
  production_decision public.admission_decision_type NOT NULL,
  shadow_decision public.admission_decision_type NOT NULL,
  diverged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS policy_shadow_runs_proposal_idx
ON public.policy_shadow_runs(proposal_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3) Updated-at, audit, RLS, and grants
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_policy_rules_updated_at ON public.policy_rules;
CREATE TRIGGER set_policy_rules_updated_at
BEFORE UPDATE ON public.policy_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_appeals_updated_at ON public.appeals;
CREATE TRIGGER set_appeals_updated_at
BEFORE UPDATE ON public.appeals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_exception_cases_updated_at ON public.exception_cases;
CREATE TRIGGER set_exception_cases_updated_at
BEFORE UPDATE ON public.exception_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_admission_ops_metrics_daily_updated_at ON public.admission_ops_metrics_daily;
CREATE TRIGGER set_admission_ops_metrics_daily_updated_at
BEFORE UPDATE ON public.admission_ops_metrics_daily
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS audit_admission_decision_runs_trigger ON public.admission_decision_runs;
CREATE TRIGGER audit_admission_decision_runs_trigger
AFTER INSERT ON public.admission_decision_runs
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_policy_rules_trigger ON public.policy_rules;
CREATE TRIGGER audit_policy_rules_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.policy_rules
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_appeals_trigger ON public.appeals;
CREATE TRIGGER audit_appeals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.appeals
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_exception_cases_trigger ON public.exception_cases;
CREATE TRIGGER audit_exception_cases_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.exception_cases
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_audit_samples_trigger ON public.audit_samples;
CREATE TRIGGER audit_audit_samples_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.audit_samples
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_admission_ops_metrics_daily_trigger ON public.admission_ops_metrics_daily;
CREATE TRIGGER audit_admission_ops_metrics_daily_trigger
AFTER INSERT OR UPDATE ON public.admission_ops_metrics_daily
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event_flexible('day');

DROP TRIGGER IF EXISTS audit_admission_ops_anomalies_trigger ON public.admission_ops_anomalies;
CREATE TRIGGER audit_admission_ops_anomalies_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admission_ops_anomalies
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_policy_change_proposals_trigger ON public.policy_change_proposals;
CREATE TRIGGER audit_policy_change_proposals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.policy_change_proposals
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_policy_shadow_runs_trigger ON public.policy_shadow_runs;
CREATE TRIGGER audit_policy_shadow_runs_trigger
AFTER INSERT ON public.policy_shadow_runs
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

ALTER TABLE public.admission_decision_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exception_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_ops_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_ops_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_shadow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_decision_runs_select_own" ON public.admission_decision_runs;
CREATE POLICY "admission_decision_runs_select_own"
ON public.admission_decision_runs
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admission_decision_runs_no_client_write" ON public.admission_decision_runs;
CREATE POLICY "admission_decision_runs_no_client_write"
ON public.admission_decision_runs
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "policy_rules_read_all" ON public.policy_rules;
CREATE POLICY "policy_rules_read_all"
ON public.policy_rules
FOR SELECT USING (true);

DROP POLICY IF EXISTS "policy_rules_no_client_write" ON public.policy_rules;
CREATE POLICY "policy_rules_no_client_write"
ON public.policy_rules
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "appeals_select_own" ON public.appeals;
CREATE POLICY "appeals_select_own"
ON public.appeals
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "appeals_no_client_write" ON public.appeals;
CREATE POLICY "appeals_no_client_write"
ON public.appeals
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "exception_cases_no_client_access" ON public.exception_cases;
CREATE POLICY "exception_cases_no_client_access"
ON public.exception_cases
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "audit_samples_no_client_access" ON public.audit_samples;
CREATE POLICY "audit_samples_no_client_access"
ON public.audit_samples
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admission_ops_metrics_daily_no_client_access" ON public.admission_ops_metrics_daily;
CREATE POLICY "admission_ops_metrics_daily_no_client_access"
ON public.admission_ops_metrics_daily
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admission_ops_anomalies_no_client_access" ON public.admission_ops_anomalies;
CREATE POLICY "admission_ops_anomalies_no_client_access"
ON public.admission_ops_anomalies
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "policy_change_proposals_no_client_access" ON public.policy_change_proposals;
CREATE POLICY "policy_change_proposals_no_client_access"
ON public.policy_change_proposals
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "policy_shadow_runs_no_client_access" ON public.policy_shadow_runs;
CREATE POLICY "policy_shadow_runs_no_client_access"
ON public.policy_shadow_runs
FOR ALL USING (false) WITH CHECK (false);

GRANT SELECT ON public.admission_decision_runs TO authenticated;
GRANT SELECT ON public.policy_rules TO authenticated;
GRANT SELECT ON public.appeals TO authenticated;

GRANT ALL ON public.admission_decision_runs TO service_role;
GRANT ALL ON public.policy_rules TO service_role;
GRANT ALL ON public.appeals TO service_role;
GRANT ALL ON public.exception_cases TO service_role;
GRANT ALL ON public.audit_samples TO service_role;
GRANT ALL ON public.admission_ops_metrics_daily TO service_role;
GRANT ALL ON public.admission_ops_anomalies TO service_role;
GRANT ALL ON public.policy_change_proposals TO service_role;
GRANT ALL ON public.policy_shadow_runs TO service_role;

-- -----------------------------------------------------------------------------
-- 4) Ops rollup and anomaly detection helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_admission_ops_metrics_daily(
  p_day DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_started INTEGER := 0;
  v_approved INTEGER := 0;
  v_rejected INTEGER := 0;
  v_resubmit INTEGER := 0;
  v_exception INTEGER := 0;
  v_decision_count INTEGER := 0;
  v_low_conf_count INTEGER := 0;
  v_purge_fail INTEGER := 0;
  v_appeal_count INTEGER := 0;
  v_appeal_resolved INTEGER := 0;
  v_appeal_overturn INTEGER := 0;
  v_avg_latency NUMERIC := 0;
  v_low_conf_rate NUMERIC := 0;
  v_ai_approval_rate NUMERIC := 0;
  v_appeal_rate NUMERIC := 0;
  v_appeal_overturn_rate NUMERIC := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_started
  FROM public.admission_applications
  WHERE DATE(started_at AT TIME ZONE 'UTC') = p_day;

  SELECT
    COUNT(*) FILTER (WHERE final_decision = 'APPROVE'),
    COUNT(*) FILTER (WHERE final_decision = 'REJECT'),
    COUNT(*) FILTER (WHERE final_decision = 'RESUBMIT_REQUIRED'),
    COUNT(*) FILTER (WHERE final_decision = 'EXCEPTION_REQUIRED'),
    COUNT(*),
    COUNT(*) FILTER (WHERE confidence_score IS NOT NULL AND confidence_score < 0.68),
    COALESCE(AVG(NULLIF((ai_outputs_json->>'decision_latency_ms')::NUMERIC, 0)), 0)
  INTO
    v_approved,
    v_rejected,
    v_resubmit,
    v_exception,
    v_decision_count,
    v_low_conf_count,
    v_avg_latency
  FROM public.admission_decision_runs
  WHERE DATE(created_at AT TIME ZONE 'UTC') = p_day;

  SELECT COUNT(*)
    INTO v_purge_fail
  FROM public.trust_ledger_events
  WHERE DATE(created_at AT TIME ZONE 'UTC') = p_day
    AND event_type = 'PURGE_FAILED';

  SELECT COUNT(*)
    INTO v_appeal_count
  FROM public.appeals
  WHERE DATE(created_at AT TIME ZONE 'UTC') = p_day;

  SELECT
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL),
    COUNT(*) FILTER (WHERE resolution_type = 'OVERTURNED')
  INTO
    v_appeal_resolved,
    v_appeal_overturn
  FROM public.appeals
  WHERE DATE(COALESCE(resolved_at, created_at) AT TIME ZONE 'UTC') = p_day;

  IF v_decision_count > 0 THEN
    v_low_conf_rate := ROUND((v_low_conf_count::NUMERIC / v_decision_count::NUMERIC), 4);
    v_ai_approval_rate := ROUND((v_approved::NUMERIC / v_decision_count::NUMERIC), 4);
    v_appeal_rate := ROUND((v_appeal_count::NUMERIC / v_decision_count::NUMERIC), 4);
  END IF;

  IF v_appeal_resolved > 0 THEN
    v_appeal_overturn_rate := ROUND((v_appeal_overturn::NUMERIC / v_appeal_resolved::NUMERIC), 4);
  END IF;

  INSERT INTO public.admission_ops_metrics_daily (
    day,
    started_count,
    approved_count,
    rejected_count,
    resubmit_count,
    exception_count,
    avg_decision_latency_ms,
    purge_failure_count,
    low_confidence_rate,
    ai_approval_rate,
    appeal_rate,
    appeal_overturn_rate
  ) VALUES (
    p_day,
    v_started,
    v_approved,
    v_rejected,
    v_resubmit,
    v_exception,
    COALESCE(v_avg_latency, 0),
    v_purge_fail,
    v_low_conf_rate,
    v_ai_approval_rate,
    v_appeal_rate,
    v_appeal_overturn_rate
  )
  ON CONFLICT (day) DO UPDATE SET
    started_count = EXCLUDED.started_count,
    approved_count = EXCLUDED.approved_count,
    rejected_count = EXCLUDED.rejected_count,
    resubmit_count = EXCLUDED.resubmit_count,
    exception_count = EXCLUDED.exception_count,
    avg_decision_latency_ms = EXCLUDED.avg_decision_latency_ms,
    purge_failure_count = EXCLUDED.purge_failure_count,
    low_confidence_rate = EXCLUDED.low_confidence_rate,
    ai_approval_rate = EXCLUDED.ai_approval_rate,
    appeal_rate = EXCLUDED.appeal_rate,
    appeal_overturn_rate = EXCLUDED.appeal_overturn_rate,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_admission_ops_anomalies(
  p_day DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_metric public.admission_ops_metrics_daily%ROWTYPE;
BEGIN
  SELECT * INTO v_metric
  FROM public.admission_ops_metrics_daily
  WHERE day = p_day;

  IF NOT FOUND THEN
    PERFORM public.refresh_admission_ops_metrics_daily(p_day);
    SELECT * INTO v_metric
    FROM public.admission_ops_metrics_daily
    WHERE day = p_day;
  END IF;

  IF v_metric.purge_failure_count > 0 THEN
    INSERT INTO public.admission_ops_anomalies(day, anomaly_type, severity, summary_json)
    VALUES (
      p_day,
      'PURGE_FAILURE',
      'HIGH',
      jsonb_build_object('purge_failure_count', v_metric.purge_failure_count)
    )
    ON CONFLICT (day, anomaly_type) DO UPDATE
      SET severity = EXCLUDED.severity,
          summary_json = EXCLUDED.summary_json,
          detected_at = NOW(),
          resolved_at = NULL;
  END IF;

  IF v_metric.low_confidence_rate >= 0.25 THEN
    INSERT INTO public.admission_ops_anomalies(day, anomaly_type, severity, summary_json)
    VALUES (
      p_day,
      'LOW_CONFIDENCE_SPIKE',
      'MEDIUM',
      jsonb_build_object('low_confidence_rate', v_metric.low_confidence_rate)
    )
    ON CONFLICT (day, anomaly_type) DO UPDATE
      SET severity = EXCLUDED.severity,
          summary_json = EXCLUDED.summary_json,
          detected_at = NOW(),
          resolved_at = NULL;
  END IF;

  IF v_metric.resubmit_count > (v_metric.approved_count + 5) THEN
    INSERT INTO public.admission_ops_anomalies(day, anomaly_type, severity, summary_json)
    VALUES (
      p_day,
      'RESUBMIT_SURGE',
      'MEDIUM',
      jsonb_build_object(
        'resubmit_count', v_metric.resubmit_count,
        'approved_count', v_metric.approved_count
      )
    )
    ON CONFLICT (day, anomaly_type) DO UPDATE
      SET severity = EXCLUDED.severity,
          summary_json = EXCLUDED.summary_json,
          detected_at = NOW(),
          resolved_at = NULL;
  END IF;

  IF v_metric.appeal_overturn_rate >= 0.20 THEN
    INSERT INTO public.admission_ops_anomalies(day, anomaly_type, severity, summary_json)
    VALUES (
      p_day,
      'APPEAL_OVERTURN_SPIKE',
      'MEDIUM',
      jsonb_build_object('appeal_overturn_rate', v_metric.appeal_overturn_rate)
    )
    ON CONFLICT (day, anomaly_type) DO UPDATE
      SET severity = EXCLUDED.severity,
          summary_json = EXCLUDED.summary_json,
          detected_at = NOW(),
          resolved_at = NULL;
  END IF;
END;
$$;

COMMIT;
