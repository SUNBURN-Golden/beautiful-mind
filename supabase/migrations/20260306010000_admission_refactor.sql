-- =============================================================================
-- SoulBound Admission Refactor (strict document admission)
-- Additive migration: keep legacy onboarding tables for backward compatibility
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.admission_document_type AS ENUM (
    'GRADUATION_CERTIFICATE',
    'INCOME_CERTIFICATE',
    'MARRIAGE_CERTIFICATE',
    'FAMILY_RELATION_CERTIFICATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_application_status AS ENUM (
    'IN_PROGRESS',
    'AI_REVIEW',
    'HUMAN_REVIEW',
    'APPROVED',
    'REJECTED',
    'RESUBMIT_REQUIRED',
    'ACTIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_step AS ENUM (
    'APPLY_START',
    'IDENTITY',
    'LIVENESS',
    'CONSENTS',
    'DOCUMENTS',
    'AI_REVIEW',
    'HUMAN_REVIEW',
    'APPROVED',
    'SOUL_ISSUED',
    'ACTIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_doc_upload_status AS ENUM (
    'MISSING',
    'UPLOADED',
    'REPLACED',
    'PURGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_doc_processing_status AS ENUM (
    'PENDING',
    'AI_PASSED',
    'AI_REJECTED',
    'HUMAN_APPROVED',
    'HUMAN_REJECTED',
    'RESUBMIT_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admission_doc_final_result AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'RESUBMIT_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_case_state AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'RESUBMIT_REQUIRED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soul_credential_status AS ENUM ('ISSUED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Core admission tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.admission_application_status NOT NULL DEFAULT 'IN_PROGRESS',
  current_step public.admission_step NOT NULL DEFAULT 'APPLY_START',
  policy_version TEXT NOT NULL DEFAULT 'admission-v1',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  ai_review_started_at TIMESTAMPTZ,
  ai_review_completed_at TIMESTAMPTZ,
  human_review_started_at TIMESTAMPTZ,
  human_review_completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason_code TEXT,
  liveness_verified_at TIMESTAMPTZ,
  soul_issued_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admission_applications_status_idx
ON public.admission_applications(status, current_step, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.admission_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type public.admission_document_type NOT NULL,
  upload_status public.admission_doc_upload_status NOT NULL DEFAULT 'MISSING',
  processing_status public.admission_doc_processing_status NOT NULL DEFAULT 'PENDING',
  ai_result TEXT,
  ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  human_result TEXT,
  final_result public.admission_doc_final_result NOT NULL DEFAULT 'PENDING',
  extracted_claims_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_storage_key_ephemeral TEXT,
  uploaded_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admission_document_owner_match
    CHECK (user_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS admission_document_unique_per_type
ON public.admission_document_submissions(admission_application_id, document_type);

CREATE INDEX IF NOT EXISTS admission_document_status_idx
ON public.admission_document_submissions(user_id, final_result, processing_status);

CREATE TABLE IF NOT EXISTS public.consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT 'admission-v1',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  typed_ack_phrase TEXT NOT NULL,
  capture_method TEXT NOT NULL DEFAULT 'web_form',
  ip_address INET,
  user_agent TEXT,
  audit_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consent_events_user_type_idx
ON public.consent_events(user_id, consent_type, granted_at DESC);

CREATE TABLE IF NOT EXISTS public.verified_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  claim_value_normalized JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_document_type public.admission_document_type,
  verification_method TEXT NOT NULL DEFAULT 'ADMISSION_REVIEW',
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  policy_version TEXT NOT NULL DEFAULT 'admission-v1',
  attestation_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verified_claims_user_type_idx
ON public.verified_claims(user_id, claim_type, verified_at DESC);

CREATE TABLE IF NOT EXISTS public.review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_application_id UUID NOT NULL UNIQUE REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state public.review_case_state NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  ai_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_cases_state_idx
ON public.review_cases(state, opened_at DESC);

CREATE TABLE IF NOT EXISTS public.review_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_case_events_case_idx
ON public.review_case_events(review_case_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.soul_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  admission_application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL DEFAULT 'SOUL_TRUST',
  trust_level TEXT NOT NULL DEFAULT 'ADMISSION_VERIFIED',
  status public.soul_credential_status NOT NULL DEFAULT 'ISSUED',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  attestation_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS soul_credentials_status_idx
ON public.soul_credentials(status, issued_at DESC);

CREATE TABLE IF NOT EXISTS public.trust_ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admission_application_id UUID REFERENCES public.admission_applications(id) ON DELETE SET NULL,
  soul_credential_id UUID REFERENCES public.soul_credentials(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_event_hash TEXT,
  event_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trust_ledger_events_user_idx
ON public.trust_ledger_events(user_id, created_at ASC);

CREATE INDEX IF NOT EXISTS trust_ledger_events_app_idx
ON public.trust_ledger_events(admission_application_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 3) Triggers and helper functions
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_admission_applications_updated_at ON public.admission_applications;
CREATE TRIGGER set_admission_applications_updated_at
BEFORE UPDATE ON public.admission_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_admission_document_submissions_updated_at ON public.admission_document_submissions;
CREATE TRIGGER set_admission_document_submissions_updated_at
BEFORE UPDATE ON public.admission_document_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_review_cases_updated_at ON public.review_cases;
CREATE TRIGGER set_review_cases_updated_at
BEFORE UPDATE ON public.review_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_soul_credentials_updated_at ON public.soul_credentials;
CREATE TRIGGER set_soul_credentials_updated_at
BEFORE UPDATE ON public.soul_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_trust_ledger_event_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_hash TEXT;
BEGIN
  SELECT tle.event_hash
  INTO v_previous_hash
  FROM public.trust_ledger_events tle
  WHERE (
    (NEW.user_id IS NOT NULL AND tle.user_id = NEW.user_id)
    OR
    (NEW.user_id IS NULL AND tle.user_id IS NULL)
  )
  ORDER BY tle.created_at DESC, tle.id DESC
  LIMIT 1;

  NEW.previous_event_hash := COALESCE(v_previous_hash, '');

  IF NEW.event_hash IS NULL OR NEW.event_hash = '' THEN
    NEW.event_hash := encode(
      extensions.digest(
        concat_ws(
          '|',
          COALESCE(NEW.user_id::TEXT, ''),
          COALESCE(NEW.admission_application_id::TEXT, ''),
          COALESCE(NEW.soul_credential_id::TEXT, ''),
          NEW.event_type,
          NEW.event_payload::TEXT,
          NEW.previous_event_hash,
          COALESCE(NEW.created_at::TEXT, NOW()::TEXT)
        ),
        'sha256'
      ),
      'hex'
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_trust_ledger_event_hash ON public.trust_ledger_events;
CREATE TRIGGER trg_set_trust_ledger_event_hash
BEFORE INSERT ON public.trust_ledger_events
FOR EACH ROW EXECUTE FUNCTION public.set_trust_ledger_event_hash();

CREATE OR REPLACE FUNCTION public.block_trust_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'trust_ledger_events is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_block_trust_ledger_update ON public.trust_ledger_events;
CREATE TRIGGER trg_block_trust_ledger_update
BEFORE UPDATE ON public.trust_ledger_events
FOR EACH ROW EXECUTE FUNCTION public.block_trust_ledger_mutation();

DROP TRIGGER IF EXISTS trg_block_trust_ledger_delete ON public.trust_ledger_events;
CREATE TRIGGER trg_block_trust_ledger_delete
BEFORE DELETE ON public.trust_ledger_events
FOR EACH ROW EXECUTE FUNCTION public.block_trust_ledger_mutation();

CREATE OR REPLACE FUNCTION public.log_trust_ledger_event(
  p_user_id UUID,
  p_admission_application_id UUID,
  p_soul_credential_id UUID,
  p_event_type TEXT,
  p_event_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.trust_ledger_events (
    user_id,
    admission_application_id,
    soul_credential_id,
    event_type,
    event_payload
  ) VALUES (
    p_user_id,
    p_admission_application_id,
    p_soul_credential_id,
    p_event_type,
    COALESCE(p_event_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- Audit integration
DROP TRIGGER IF EXISTS audit_admission_applications_trigger ON public.admission_applications;
CREATE TRIGGER audit_admission_applications_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admission_applications
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_admission_document_submissions_trigger ON public.admission_document_submissions;
CREATE TRIGGER audit_admission_document_submissions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admission_document_submissions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_consent_events_trigger ON public.consent_events;
CREATE TRIGGER audit_consent_events_trigger
AFTER INSERT ON public.consent_events
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_verified_claims_trigger ON public.verified_claims;
CREATE TRIGGER audit_verified_claims_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.verified_claims
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_cases_trigger ON public.review_cases;
CREATE TRIGGER audit_review_cases_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.review_cases
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_case_events_trigger ON public.review_case_events;
CREATE TRIGGER audit_review_case_events_trigger
AFTER INSERT ON public.review_case_events
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_soul_credentials_trigger ON public.soul_credentials;
CREATE TRIGGER audit_soul_credentials_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.soul_credentials
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_trust_ledger_events_trigger ON public.trust_ledger_events;
CREATE TRIGGER audit_trust_ledger_events_trigger
AFTER INSERT ON public.trust_ledger_events
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- -----------------------------------------------------------------------------
-- 4) RLS policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_document_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soul_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_ledger_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_applications_select_own" ON public.admission_applications;
CREATE POLICY "admission_applications_select_own"
ON public.admission_applications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admission_applications_no_client_write" ON public.admission_applications;
CREATE POLICY "admission_applications_no_client_write"
ON public.admission_applications
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admission_document_submissions_select_own" ON public.admission_document_submissions;
CREATE POLICY "admission_document_submissions_select_own"
ON public.admission_document_submissions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admission_document_submissions_no_client_write" ON public.admission_document_submissions;
CREATE POLICY "admission_document_submissions_no_client_write"
ON public.admission_document_submissions
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "consent_events_select_own" ON public.consent_events;
CREATE POLICY "consent_events_select_own"
ON public.consent_events
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consent_events_no_client_write" ON public.consent_events;
CREATE POLICY "consent_events_no_client_write"
ON public.consent_events
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "verified_claims_select_own" ON public.verified_claims;
CREATE POLICY "verified_claims_select_own"
ON public.verified_claims
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "verified_claims_no_client_write" ON public.verified_claims;
CREATE POLICY "verified_claims_no_client_write"
ON public.verified_claims
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "review_cases_no_client_access" ON public.review_cases;
CREATE POLICY "review_cases_no_client_access"
ON public.review_cases
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "review_case_events_no_client_access" ON public.review_case_events;
CREATE POLICY "review_case_events_no_client_access"
ON public.review_case_events
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "soul_credentials_select_own" ON public.soul_credentials;
CREATE POLICY "soul_credentials_select_own"
ON public.soul_credentials
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "soul_credentials_no_client_write" ON public.soul_credentials;
CREATE POLICY "soul_credentials_no_client_write"
ON public.soul_credentials
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "trust_ledger_events_select_own" ON public.trust_ledger_events;
CREATE POLICY "trust_ledger_events_select_own"
ON public.trust_ledger_events
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trust_ledger_events_no_client_write" ON public.trust_ledger_events;
CREATE POLICY "trust_ledger_events_no_client_write"
ON public.trust_ledger_events
FOR ALL USING (false) WITH CHECK (false);

-- Service role grants
GRANT SELECT ON public.admission_applications TO authenticated;
GRANT SELECT ON public.admission_document_submissions TO authenticated;
GRANT SELECT ON public.consent_events TO authenticated;
GRANT SELECT ON public.verified_claims TO authenticated;
GRANT SELECT ON public.soul_credentials TO authenticated;
GRANT SELECT ON public.trust_ledger_events TO authenticated;

GRANT ALL ON public.admission_applications TO service_role;
GRANT ALL ON public.admission_document_submissions TO service_role;
GRANT ALL ON public.consent_events TO service_role;
GRANT ALL ON public.verified_claims TO service_role;
GRANT ALL ON public.review_cases TO service_role;
GRANT ALL ON public.review_case_events TO service_role;
GRANT ALL ON public.soul_credentials TO service_role;
GRANT ALL ON public.trust_ledger_events TO service_role;

COMMIT;
