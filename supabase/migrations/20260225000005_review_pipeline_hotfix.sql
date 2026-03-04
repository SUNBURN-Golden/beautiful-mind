-- ==========================================
-- SOULBOUND MVP - REVIEW PIPELINE HOTFIX
-- Phase 3 Step 0.2.1 (Additive Patch)
-- ==========================================

BEGIN;

-- -----------------------------------------------------------------------------
-- [0.A] Audit Trigger Hotfix (DELETE-safe)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_review_sessions ON public.review_sessions;
CREATE TRIGGER audit_review_sessions AFTER INSERT OR UPDATE ON public.review_sessions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_facts ON public.review_facts;
CREATE TRIGGER audit_review_facts AFTER INSERT OR UPDATE ON public.review_facts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_questions ON public.review_questions;
CREATE TRIGGER audit_review_questions AFTER INSERT OR UPDATE ON public.review_questions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_drafts ON public.review_drafts;
CREATE TRIGGER audit_review_drafts AFTER INSERT OR UPDATE ON public.review_drafts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_signatures ON public.review_signatures;
CREATE TRIGGER audit_review_signatures AFTER INSERT OR UPDATE ON public.review_signatures
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();


-- -----------------------------------------------------------------------------
-- [0.B] Session Dedup
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS review_sessions_unique_match_reviewer
ON public.review_sessions(match_id, reviewer_id)
WHERE stage <> 'ABORTED';


-- -----------------------------------------------------------------------------
-- [1] Access Control Additive Patch (RLS + Unlock + RAW 분리)
-- -----------------------------------------------------------------------------

-- 1-A) review_sessions에 시간 필드 추가
ALTER TABLE public.review_sessions
  ADD COLUMN IF NOT EXISTS met_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reveal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_fee BIGINT NOT NULL DEFAULT 0;

-- 1-B) 유료 열람 unlock 테이블 추가
CREATE TABLE IF NOT EXISTS public.review_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS review_unlocks_session_viewer_idx
ON public.review_unlocks(session_id, viewer_id);

-- 1-C) RAW 텍스트 분리(Reviewer-only)
CREATE TABLE IF NOT EXISTS public.review_session_raw (
  session_id UUID PRIMARY KEY REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_raw_text TEXT,
  user_raw_hash TEXT,
  risk_flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기존 데이터 마이그레이션: review_sessions에 있던 raw를 분리
INSERT INTO public.review_session_raw(session_id, reviewer_id, user_raw_text, user_raw_hash, risk_flags)
SELECT id, reviewer_id, user_raw_text, user_raw_hash, risk_flags
FROM public.review_sessions
WHERE user_raw_text IS NOT NULL
ON CONFLICT (session_id) DO NOTHING;

-- 원 테이블의 raw는 “비워서” target에게 우발 노출 방지
UPDATE public.review_sessions
SET user_raw_text = NULL,
    user_raw_hash = NULL,
    risk_flags = '{}'
WHERE user_raw_text IS NOT NULL OR user_raw_hash IS NOT NULL OR risk_flags <> '{}';

-- review_session_raw RLS (reviewer만 읽기)
ALTER TABLE public.review_session_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_raw reviewer read" ON public.review_session_raw;
CREATE POLICY "review_raw reviewer read" ON public.review_session_raw
FOR SELECT USING (auth.uid() = reviewer_id);

-- client write 차단(서버만)
DROP POLICY IF EXISTS "review_raw no client write" ON public.review_session_raw;
CREATE POLICY "review_raw no client write" ON public.review_session_raw
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.review_session_raw FROM anon, authenticated;
GRANT SELECT ON TABLE public.review_session_raw TO authenticated;
GRANT ALL ON TABLE public.review_session_raw TO service_role;


-- -----------------------------------------------------------------------------
-- [2] RLS 정책 교체: target은 “SIGNED/FINALIZED + reveal_at + unlock” 조건에서만 signatures 열람
-- -----------------------------------------------------------------------------

-- 2-A) review_sessions: reviewer만 기본 열람
DROP POLICY IF EXISTS "review_sessions party read" ON public.review_sessions;
CREATE POLICY "review_sessions reviewer read" ON public.review_sessions
FOR SELECT USING (auth.uid() = reviewer_id);

-- 2-B) review_facts: reviewer만(항상)
DROP POLICY IF EXISTS "review_facts party read" ON public.review_facts;
CREATE POLICY "review_facts reviewer read" ON public.review_facts
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND auth.uid() = s.reviewer_id
));

-- 2-C) review_signatures: target은 reveal_at 이후 + unlock 후에만
DROP POLICY IF EXISTS "review_signatures party read" ON public.review_signatures;

-- reviewer는 항상 열람
CREATE POLICY "review_signatures reviewer read" ON public.review_signatures
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.review_sessions s
  WHERE s.id = session_id AND auth.uid() = s.reviewer_id
));

-- target은 (SIGNED/FINALIZED) && reveal_at<=now && unlock 존재 시 열람
CREATE POLICY "review_signatures target unlock read" ON public.review_signatures
FOR SELECT USING (EXISTS (
  SELECT 1
  FROM public.review_sessions s
  JOIN public.review_unlocks u
    ON u.session_id = s.id AND u.viewer_id = auth.uid()
  WHERE s.id = session_id
    AND auth.uid() = s.target_id
    AND s.stage IN ('SIGNED','FINALIZED')
    AND s.reveal_at IS NOT NULL
    AND s.reveal_at <= NOW()
));

COMMIT;
