-- ==========================================
-- SOULBOUND MVP - MASTER DB MIGRATION (PATCHED)
-- ==========================================

-- Extensions
-- 만약 "CREATE EXTENSION ... cannot run inside a transaction block" 에러가 발생하면,
-- 이 스크립트를 관리자 권한으로 실행하거나, 따로 분리해서 실행하십시오.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- (옵션) 개발 중 완전 초기화가 필요하면 주석 해제
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS pair_outcomes CASCADE;
-- DROP TABLE IF EXISTS match_reviews CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS user_traits CASCADE;
-- DROP TABLE IF EXISTS interviews CASCADE;
-- DROP TABLE IF EXISTS contracts CASCADE;
-- DROP TABLE IF EXISTS consents CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TYPE IF EXISTS verification_module;
-- DROP TYPE IF EXISTS audit_action;

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE verification_module AS ENUM ('OSINT', 'LOCATION', 'DEVICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Tables (FK order)

-- 2.1 profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Changed from NOT NULL UNIQUE to allow patching existing rows first
  reputation_score INTEGER DEFAULT 100,
  verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블이 있을 때 컬럼 누락 보강
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 기존 테이블에 email 컬럼의 NOT NULL / UNIQUE 제약조건이 남아있다면 제거 (백필을 위해)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='profiles'
      AND column_name='email'
      AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 유저 편집 가능 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 안전한 email 백필 (기존 데이터 복구용)
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS NULL OR p.email = '');

-- 기존 데이터에 NULL/중복 가능성 고려해서 "부분 unique index"로 안전하게 (대소문자 무시)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
ON profiles (lower(email))
WHERE email IS NOT NULL AND email <> '';

-- 2.2 consents
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module verification_module NOT NULL,
  is_granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Legacy fields (요청 반영)
  terms_accepted BOOLEAN DEFAULT false,
  privacy_accepted BOOLEAN DEFAULT false,
  deep_profiling BOOLEAN DEFAULT false,
  marketing_accepted BOOLEAN DEFAULT false,

  UNIQUE(user_id, module)
);

ALTER TABLE consents ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE consents ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false;
ALTER TABLE consents ADD COLUMN IF NOT EXISTS deep_profiling BOOLEAN DEFAULT false;
ALTER TABLE consents ADD COLUMN IF NOT EXISTS marketing_accepted BOOLEAN DEFAULT false;

-- 2.3 contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signature_base64 TEXT NOT NULL,
  agreed_to_terms BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'IN_PROGRESS',

  decision TEXT,
  score INTEGER,
  absolute_score SMALLINT,
  flags JSONB DEFAULT '{}'::jsonb,
  risk_flags TEXT[],
  summary TEXT,

  transcript_json JSONB DEFAULT '[]'::jsonb,
  analysis_json JSONB,
  model_version TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS analysis_json JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS absolute_score SMALLINT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS risk_flags TEXT[];
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS model_version TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'IN_PROGRESS';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 테이블에 NOT NULL 제약조건이 묶여있다면 (구버전 스키마 대응) 제거
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='decision' AND is_nullable='NO') THEN
    ALTER TABLE public.interviews ALTER COLUMN decision DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='score' AND is_nullable='NO') THEN
    ALTER TABLE public.interviews ALTER COLUMN score DROP NOT NULL;
  END IF;
END $$;

-- Status Check Constraints
DO $$ BEGIN
  ALTER TABLE interviews ADD CONSTRAINT interviews_status_check CHECK (status IN ('IN_PROGRESS','DONE','REJECTED','APPROVED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.5 user_traits (매칭 캐시)
CREATE TABLE IF NOT EXISTS user_traits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  traits_json JSONB NOT NULL,
  absolute_score SMALLINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_traits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.6 matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, HIDDEN, UNMATCHED
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user1_id <> user2_id)
);

-- (A,B) vs (B,A) 중복 방지용 정규화 인덱스
ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_low UUID GENERATED ALWAYS AS (LEAST(user1_id, user2_id)) STORED;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_high UUID GENERATED ALWAYS AS (GREATEST(user1_id, user2_id)) STORED;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS matches_unique_pair ON matches (user_low, user_high);

-- Status Check Constraints
DO $$ BEGIN
  ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN ('ACTIVE','HIDDEN','UNMATCHED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.7 messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_match_id_idx ON messages(match_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

-- 2.8 match_reviews
CREATE TABLE IF NOT EXISTS match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback_text TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, reviewer_id),
  CHECK (reviewer_id <> target_id)
);

-- 2.9 pair_outcomes
CREATE TABLE IF NOT EXISTS pair_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_score SMALLINT CHECK (interaction_score >= 0 AND interaction_score <= 100),
  feedback_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, peer_id),
  CHECK (user_id <> peer_id)
);

-- 2.10 audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 Foreign Key Indexes (Performance)
CREATE INDEX IF NOT EXISTS consents_user_id_idx ON consents(user_id);
CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON contracts(user_id);
CREATE INDEX IF NOT EXISTS interviews_user_id_idx ON interviews(user_id);
CREATE INDEX IF NOT EXISTS matches_user1_id_idx ON matches(user1_id);
CREATE INDEX IF NOT EXISTS matches_user2_id_idx ON matches(user2_id);
CREATE INDEX IF NOT EXISTS match_reviews_match_id_idx ON match_reviews(match_id);
CREATE INDEX IF NOT EXISTS match_reviews_target_id_idx ON match_reviews(target_id);
CREATE INDEX IF NOT EXISTS match_reviews_reviewer_id_idx ON match_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS pair_outcomes_user_id_idx ON pair_outcomes(user_id);
CREATE INDEX IF NOT EXISTS pair_outcomes_peer_id_idx ON pair_outcomes(peer_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON audit_logs(table_name, record_id);

-- 3) Admin check helper (RLS recursion 방지)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 4) Audit trigger function (RLS 무시하도록 row_security off)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  old_record JSONB := NULL;
  new_record JSONB := NULL;
  user_id UUID := auth.uid();
BEGIN
  IF (TG_OP = 'DELETE') THEN
    old_record := row_to_json(OLD)::JSONB;
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, OLD.id, 'DELETE', old_record, user_id);
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    old_record := row_to_json(OLD)::JSONB;
    new_record := row_to_json(NEW)::JSONB;
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'UPDATE', old_record, new_record, user_id);
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    new_record := row_to_json(NEW)::JSONB;
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'INSERT', new_record, user_id);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 4.5) set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

-- 5) Attach audit triggers (user_traits는 id 컬럼이 없어서 제외)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS audit_consents_trigger ON consents;
CREATE TRIGGER audit_consents_trigger AFTER INSERT OR UPDATE OR DELETE ON consents
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_contracts_trigger ON contracts;
CREATE TRIGGER audit_contracts_trigger AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_interviews_trigger ON interviews;
CREATE TRIGGER audit_interviews_trigger AFTER INSERT OR UPDATE OR DELETE ON interviews
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS set_interviews_updated_at ON interviews;
CREATE TRIGGER set_interviews_updated_at BEFORE UPDATE ON interviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_traits_updated_at ON user_traits;
CREATE TRIGGER set_user_traits_updated_at BEFORE UPDATE ON user_traits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS audit_matches_trigger ON matches;
CREATE TRIGGER audit_matches_trigger AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS set_matches_updated_at ON matches;
CREATE TRIGGER set_matches_updated_at BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS audit_messages_trigger ON messages;
CREATE TRIGGER audit_messages_trigger AFTER INSERT OR UPDATE OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_match_reviews_trigger ON match_reviews;
CREATE TRIGGER audit_match_reviews_trigger AFTER INSERT OR UPDATE OR DELETE ON match_reviews
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_pair_outcomes_trigger ON pair_outcomes;
CREATE TRIGGER audit_pair_outcomes_trigger AFTER INSERT OR UPDATE OR DELETE ON pair_outcomes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 6) Admin bootstrap (profiles row가 없을 수 있으니 UPSERT)
INSERT INTO profiles (id, email, is_admin)
SELECT u.id, u.email, true
FROM auth.users u
WHERE u.email = 'justice.parkit@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  is_admin = true;

-- 7) Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pair_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8) Base RLS policies

-- profiles: user self
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
  AND email = current_setting('request.jwt.claim.email', true)
);

-- ⚠️ profiles 업데이트는 민감 컬럼(verified/is_admin/banned 등) 보호가 필요
-- 일단 정책은 유지하되, 아래에서 컬럼 권한으로 민감 컬럼 업데이트 차단
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- consents: user self
DROP POLICY IF EXISTS "Users can select own consents" ON consents;
CREATE POLICY "Users can select own consents" ON consents
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consents" ON consents;
CREATE POLICY "Users can insert own consents" ON consents
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own consents" ON consents;
CREATE POLICY "Users can update own consents" ON consents
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own consents" ON consents;
CREATE POLICY "Users can delete own consents" ON consents
FOR DELETE USING (auth.uid() = user_id);

-- contracts: user self
DROP POLICY IF EXISTS "Users can select own contracts" ON contracts;
CREATE POLICY "Users can select own contracts" ON contracts
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
CREATE POLICY "Users can insert own contracts" ON contracts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- interviews: user self read/insert (업데이트는 서버에서만 하려면 정책 생략 가능)
DROP POLICY IF EXISTS "Users can select own interviews" ON interviews;
CREATE POLICY "Users can select own interviews" ON interviews
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interviews" ON interviews;
CREATE POLICY "Users can insert own interviews" ON interviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_traits: user self read
DROP POLICY IF EXISTS "Users can view their own traits" ON user_traits;
CREATE POLICY "Users can view their own traits" ON user_traits
FOR SELECT USING (auth.uid() = user_id);

-- matches: participants read/update only
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches
FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can update own matches" ON matches;
CREATE POLICY "Users can update own matches" ON matches
FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ❌ matches INSERT 정책은 제거 (서버/service key로만 생성 권장)

-- messages: match participants
DROP POLICY IF EXISTS "Users can view messages of their matches" ON messages;
CREATE POLICY "Users can view messages of their matches" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert messages to their matches" ON messages;
CREATE POLICY "Users can insert messages to their matches" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

-- match_reviews: by/for participants
DROP POLICY IF EXISTS "Users can view reviews by or about them" ON match_reviews;
CREATE POLICY "Users can view reviews by or about them" ON match_reviews
FOR SELECT USING (auth.uid() = reviewer_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can insert reviews for their matches" ON match_reviews;
CREATE POLICY "Users can insert reviews for their matches" ON match_reviews
FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_reviews.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

-- pair_outcomes: 당사자 2명 read
DROP POLICY IF EXISTS "Users can view their own outcomes" ON pair_outcomes;
CREATE POLICY "Users can view their own outcomes" ON pair_outcomes
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = peer_id);

-- audit_logs: 기본은 admin만 read
-- (클라이언트 insert는 막기 위해 권한 revoke)
DROP POLICY IF EXISTS "Admins can view all audit_logs" ON audit_logs;
CREATE POLICY "Admins can view all audit_logs" ON audit_logs
FOR SELECT USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM anon, authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- 9) Admin policies (recursion-safe via is_admin())

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (public.is_admin())
WITH CHECK (public.is_admin());

-- other tables (admin read)
DROP POLICY IF EXISTS "Admins can view all consents" ON consents;
CREATE POLICY "Admins can view all consents" ON consents
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all contracts" ON contracts;
CREATE POLICY "Admins can view all contracts" ON contracts
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all interviews" ON interviews;
CREATE POLICY "Admins can view all interviews" ON interviews
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all user_traits" ON user_traits;
CREATE POLICY "Admins can view all user_traits" ON user_traits
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
CREATE POLICY "Admins can view all matches" ON matches
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all match_reviews" ON match_reviews;
CREATE POLICY "Admins can view all match_reviews" ON match_reviews
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all pair_outcomes" ON pair_outcomes;
CREATE POLICY "Admins can view all pair_outcomes" ON pair_outcomes
FOR SELECT USING (public.is_admin());

-- 10) profiles 민감 컬럼 업데이트 차단 (RLS만으로는 컬럼 제한이 안 되므로 권한으로 막음)
REVOKE UPDATE (is_admin, banned, verified, reputation_score, email) ON profiles FROM authenticated;

-- (Optional Hardening) 타임스탬프 임의 조작 방지 (신뢰성 보장)
REVOKE UPDATE (created_at, updated_at) ON profiles FROM authenticated;

-- 11) Explicit Grants for Authenticated Users (Base access before RLS)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON profiles TO authenticated;
GRANT UPDATE (display_name, bio, avatar_url) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON consents TO authenticated;
GRANT SELECT, INSERT ON contracts TO authenticated;
GRANT SELECT, INSERT ON interviews TO authenticated;
GRANT SELECT ON user_traits TO authenticated;
GRANT SELECT ON matches TO authenticated;
GRANT UPDATE (status) ON matches TO authenticated;
REVOKE UPDATE (user1_id, user2_id, user_low, user_high, created_at, updated_at) ON matches FROM authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT ON match_reviews TO authenticated;
GRANT SELECT ON pair_outcomes TO authenticated;

-- 12) Realtime (채팅 및 리뷰 실시간 연동)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'match_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reviews;
  END IF;
END $$;

COMMIT;
