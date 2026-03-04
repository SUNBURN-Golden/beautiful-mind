-- 0) interviews: status 포함 보장
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'IN_PROGRESS';

-- 1) interviews 확장
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS transcript_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS analysis_json JSONB;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS absolute_score SMALLINT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS risk_flags TEXT[];
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS model_version TEXT;

-- 2) 인터뷰 정합성 체크 (중복 생성 방지용 DO 블록)
DO $$ BEGIN
  ALTER TABLE public.interviews
    ADD CONSTRAINT interviews_status_check
    CHECK (status IN ('IN_PROGRESS','DONE','REJECTED','APPROVED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.interviews
    ADD CONSTRAINT interviews_decision_check
    CHECK (decision IS NULL OR decision IN ('PASS','REVIEW','REJECT'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.interviews
    ADD CONSTRAINT interviews_absolute_score_check
    CHECK (absolute_score IS NULL OR (absolute_score >= 0 AND absolute_score <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) user_traits (매칭 캐시)
CREATE TABLE IF NOT EXISTS public.user_traits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  traits_json JSONB NOT NULL,
  absolute_score SMALLINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_traits_absolute_score_check
    CHECK (absolute_score IS NULL OR (absolute_score >= 0 AND absolute_score <= 100))
);

CREATE INDEX IF NOT EXISTS user_traits_updated_at_idx ON public.user_traits(updated_at DESC);

ALTER TABLE public.user_traits ENABLE ROW LEVEL SECURITY;

-- 정책 충돌 방지: 서브쿼리로 admin 판정
DROP POLICY IF EXISTS "user_traits self read" ON public.user_traits;
CREATE POLICY "user_traits self read" ON public.user_traits
FOR SELECT USING (
  auth.uid() = user_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

-- 서버(Route/service_role)에서만 write (클라 직접 write 금지)
DROP POLICY IF EXISTS "user_traits no client write" ON public.user_traits;
CREATE POLICY "user_traits no client write" ON public.user_traits
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.user_traits FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_traits TO authenticated;
GRANT ALL ON TABLE public.user_traits TO service_role;

-- 4) pair_outcomes (피드백 루프)
CREATE TABLE IF NOT EXISTS public.pair_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_score SMALLINT CHECK (interaction_score >= 0 AND interaction_score <= 100),
  feedback_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, peer_id),
  CHECK (user_id <> peer_id)
);

CREATE INDEX IF NOT EXISTS pair_outcomes_user_peer_idx ON public.pair_outcomes(user_id, peer_id);
CREATE INDEX IF NOT EXISTS pair_outcomes_created_at_idx ON public.pair_outcomes(created_at DESC);

ALTER TABLE public.pair_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pair_outcomes select parties" ON public.pair_outcomes;
CREATE POLICY "pair_outcomes select parties" ON public.pair_outcomes
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = peer_id
  OR (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

-- 유저가 본인 user_id로만 INSERT 허용
DROP POLICY IF EXISTS "pair_outcomes insert by self" ON public.pair_outcomes;
CREATE POLICY "pair_outcomes insert by self" ON public.pair_outcomes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- update/delete는 기본 금지
DROP POLICY IF EXISTS "pair_outcomes no update delete" ON public.pair_outcomes;
CREATE POLICY "pair_outcomes no update delete" ON public.pair_outcomes
FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "pair_outcomes no delete" ON public.pair_outcomes;
CREATE POLICY "pair_outcomes no delete" ON public.pair_outcomes
FOR DELETE USING (false);

REVOKE ALL ON TABLE public.pair_outcomes FROM anon;
GRANT SELECT, INSERT ON TABLE public.pair_outcomes TO authenticated;
GRANT ALL ON TABLE public.pair_outcomes TO service_role;
