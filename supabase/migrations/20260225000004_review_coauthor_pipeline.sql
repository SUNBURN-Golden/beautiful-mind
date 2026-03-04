-- ==========================================
-- SOULBOUND MVP - REVIEW COAUTHOR PIPELINE
-- Phase 3 Step 0.2 (Additive Patch)
-- ==========================================

BEGIN;

-- 1. Review Session
CREATE TABLE IF NOT EXISTS public.review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'RAW',
  user_raw_text TEXT,
  user_raw_hash TEXT,
  risk_flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_sessions_no_self CHECK (reviewer_id <> target_id)
);

CREATE INDEX IF NOT EXISTS review_sessions_match_idx ON public.review_sessions(match_id);
CREATE INDEX IF NOT EXISTS review_sessions_reviewer_time_idx ON public.review_sessions(reviewer_id, created_at DESC);

-- 2. Extracted Facts
CREATE TABLE IF NOT EXISTS public.review_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,
  polarity TEXT NOT NULL,
  claim TEXT NOT NULL,
  evidence_spans JSONB NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_facts_session_idx ON public.review_facts(session_id);

-- 3. Questions
CREATE TABLE IF NOT EXISTS public.review_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  target_field TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_type TEXT NOT NULL DEFAULT 'TEXT',
  user_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS review_questions_session_idx ON public.review_questions(session_id);

-- 4. Draft
CREATE TABLE IF NOT EXISTS public.review_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  draft_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_drafts_session_idx ON public.review_drafts(session_id);

-- 5. Final Signature
CREATE TABLE IF NOT EXISTS public.review_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  signed_text TEXT NOT NULL,
  signed_hash TEXT NOT NULL,
  signature_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_signatures ENABLE ROW LEVEL SECURITY;

-- Reads
DROP POLICY IF EXISTS "review_sessions party read" ON public.review_sessions;
CREATE POLICY "review_sessions party read" ON public.review_sessions
FOR SELECT USING (auth.uid() = reviewer_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "review_facts party read" ON public.review_facts;
CREATE POLICY "review_facts party read" ON public.review_facts
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND (auth.uid() = s.reviewer_id OR auth.uid() = s.target_id)
));

DROP POLICY IF EXISTS "review_questions party read" ON public.review_questions;
CREATE POLICY "review_questions party read" ON public.review_questions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND auth.uid() = s.reviewer_id
));

DROP POLICY IF EXISTS "review_drafts party read" ON public.review_drafts;
CREATE POLICY "review_drafts party read" ON public.review_drafts
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND auth.uid() = s.reviewer_id
));

DROP POLICY IF EXISTS "review_signatures party read" ON public.review_signatures;
CREATE POLICY "review_signatures party read" ON public.review_signatures
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND (auth.uid() = s.reviewer_id OR auth.uid() = s.target_id)
));

-- Writes (Server only)
DO $$ BEGIN DROP POLICY IF EXISTS "review_sessions no client write" ON public.review_sessions; CREATE POLICY "review_sessions no client write" ON public.review_sessions FOR ALL USING (false) WITH CHECK (false); EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "review_facts no client write" ON public.review_facts; CREATE POLICY "review_facts no client write" ON public.review_facts FOR ALL USING (false) WITH CHECK (false); EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "review_questions no client write" ON public.review_questions; CREATE POLICY "review_questions no client write" ON public.review_questions FOR ALL USING (false) WITH CHECK (false); EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "review_drafts no client write" ON public.review_drafts; CREATE POLICY "review_drafts no client write" ON public.review_drafts FOR ALL USING (false) WITH CHECK (false); EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "review_signatures no client write" ON public.review_signatures; CREATE POLICY "review_signatures no client write" ON public.review_signatures FOR ALL USING (false) WITH CHECK (false); EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Grants
REVOKE ALL ON TABLE public.review_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.review_facts FROM anon, authenticated;
REVOKE ALL ON TABLE public.review_questions FROM anon, authenticated;
REVOKE ALL ON TABLE public.review_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE public.review_signatures FROM anon, authenticated;

GRANT SELECT ON TABLE public.review_sessions TO authenticated;
GRANT SELECT ON TABLE public.review_facts TO authenticated;
GRANT SELECT ON TABLE public.review_questions TO authenticated;
GRANT SELECT ON TABLE public.review_drafts TO authenticated;
GRANT SELECT ON TABLE public.review_signatures TO authenticated;

GRANT ALL ON TABLE public.review_sessions TO service_role;
GRANT ALL ON TABLE public.review_facts TO service_role;
GRANT ALL ON TABLE public.review_questions TO service_role;
GRANT ALL ON TABLE public.review_drafts TO service_role;
GRANT ALL ON TABLE public.review_signatures TO service_role;

-- Triggers
DROP TRIGGER IF EXISTS set_review_sessions_updated_at ON public.review_sessions;
CREATE TRIGGER set_review_sessions_updated_at BEFORE UPDATE ON public.review_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit Triggers (Anchor Chain) - Assuming all these tables use id = UUID
DROP TRIGGER IF EXISTS audit_review_sessions ON public.review_sessions;
CREATE TRIGGER audit_review_sessions AFTER INSERT OR UPDATE OR DELETE ON public.review_sessions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_facts ON public.review_facts;
CREATE TRIGGER audit_review_facts AFTER INSERT OR UPDATE OR DELETE ON public.review_facts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_questions ON public.review_questions;
CREATE TRIGGER audit_review_questions AFTER INSERT OR UPDATE OR DELETE ON public.review_questions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_drafts ON public.review_drafts;
CREATE TRIGGER audit_review_drafts AFTER INSERT OR UPDATE OR DELETE ON public.review_drafts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_signatures ON public.review_signatures;
CREATE TRIGGER audit_review_signatures AFTER INSERT OR UPDATE OR DELETE ON public.review_signatures
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

COMMIT;
