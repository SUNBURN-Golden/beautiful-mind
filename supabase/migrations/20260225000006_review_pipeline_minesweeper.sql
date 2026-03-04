-- ==========================================
-- SOULBOUND MVP - REVIEW PIPELINE MINESWEEPER HOTFIX
-- Phase 3 Step 0.2.2 (Additive Patch)
-- ==========================================

BEGIN;

-- 1.1 Ensure review_unlocks exists (if already exists, just patch constraints/indexes)
CREATE TABLE IF NOT EXISTS public.review_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS review_unlocks_session_viewer_idx
ON public.review_unlocks(session_id, viewer_id);

-- Dedup guard: 1 unlock per (session, viewer)
DO $$ BEGIN
  CREATE UNIQUE INDEX review_unlocks_unique_session_viewer
  ON public.review_unlocks(session_id, viewer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.2 Ensure review_session_raw exists + has UUID id (needed because log_audit_event expects row.id)
DO $$
DECLARE
  pk_name TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='review_session_raw'
  ) THEN
    CREATE TABLE public.review_session_raw (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL UNIQUE REFERENCES public.review_sessions(id) ON DELETE CASCADE,
      reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      user_raw_text TEXT,
      user_raw_hash TEXT,
      risk_flags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='review_session_raw' AND column_name='id'
  ) THEN
    ALTER TABLE public.review_session_raw ADD COLUMN id UUID;
    UPDATE public.review_session_raw SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE public.review_session_raw ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Find and drop the existing PK so we can apply the new one
    SELECT tc.constraint_name INTO pk_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'review_session_raw' 
      AND tc.constraint_type = 'PRIMARY KEY';

    IF pk_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.review_session_raw DROP CONSTRAINT ' || pk_name;
      
      -- Add a UNIQUE constraint to the session_id since it was the old PK
      BEGIN
        ALTER TABLE public.review_session_raw ADD CONSTRAINT review_session_raw_session_id_key UNIQUE (session_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;

    -- Best-effort new PK
    BEGIN
      ALTER TABLE public.review_session_raw ADD CONSTRAINT review_session_raw_pkey PRIMARY KEY (id);
    EXCEPTION WHEN duplicate_object THEN NULL;
              WHEN invalid_table_definition THEN NULL; -- e.g. multiple primary keys
    END;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS review_session_raw_session_idx
ON public.review_session_raw(session_id);

CREATE INDEX IF NOT EXISTS review_session_raw_reviewer_time_idx
ON public.review_session_raw(reviewer_id, created_at DESC);

-- 1.3 RLS for review_unlocks + review_session_raw (server write only)
ALTER TABLE public.review_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_session_raw ENABLE ROW LEVEL SECURITY;

-- Reads:
-- review_unlocks: viewer can see their own unlock records
DROP POLICY IF EXISTS "review_unlocks viewer read" ON public.review_unlocks;
CREATE POLICY "review_unlocks viewer read" ON public.review_unlocks
FOR SELECT USING (auth.uid() = viewer_id);

-- review_session_raw: reviewer only (raw text never visible to target)
DROP POLICY IF EXISTS "review_raw reviewer read" ON public.review_session_raw;
CREATE POLICY "review_raw reviewer read" ON public.review_session_raw
FOR SELECT USING (auth.uid() = reviewer_id);

-- Writes blocked for clients
DROP POLICY IF EXISTS "review_unlocks no client write" ON public.review_unlocks;
CREATE POLICY "review_unlocks no client write" ON public.review_unlocks
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "review_raw no client write" ON public.review_session_raw;
CREATE POLICY "review_raw no client write" ON public.review_session_raw
FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.review_unlocks FROM anon, authenticated;
REVOKE ALL ON TABLE public.review_session_raw FROM anon, authenticated;

GRANT SELECT ON TABLE public.review_unlocks TO authenticated;
GRANT SELECT ON TABLE public.review_session_raw TO authenticated;

GRANT ALL ON TABLE public.review_unlocks TO service_role;
GRANT ALL ON TABLE public.review_session_raw TO service_role;

-- 1.4 AUDIT TRIGGERS (DELETE-safe: INSERT/UPDATE only)
DROP TRIGGER IF EXISTS audit_review_unlocks ON public.review_unlocks;
CREATE TRIGGER audit_review_unlocks
AFTER INSERT OR UPDATE ON public.review_unlocks
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_review_session_raw ON public.review_session_raw;
CREATE TRIGGER audit_review_session_raw
AFTER INSERT OR UPDATE ON public.review_session_raw
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 1.5 Ensure review_sessions has scheduling fields used by unlock policy and sweep
ALTER TABLE public.review_sessions
  ADD COLUMN IF NOT EXISTS met_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reveal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_fee BIGINT NOT NULL DEFAULT 0;

COMMIT;
