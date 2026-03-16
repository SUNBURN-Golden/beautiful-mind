-- ==============================================================================
-- Phase 2 - Step 4 Lite: Final Integrity Setup
-- ==============================================================================
-- [실행 순서]
-- Step 1: 확장 기능 활성화 (단독 실행)
-- Supabase SQL Editor에서 아래 한 줄만 먼저 실행하여 `pgcrypto`를 로드하라. 
-- (트랜잭션 에러 방지용. 이미 이전에 활성화되어 있다면 건너뛰어도 됩니다.)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: 테이블 및 RPC 생성 (Race-Safe Logic)
-- ==============================================================================

-- 1) Table
CREATE TABLE IF NOT EXISTS public.integrity_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table TEXT NOT NULL,
  start_record_id UUID NULL,
  end_record_id UUID NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  root_hash TEXT NOT NULL,
  previous_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT integrity_anchors_root_hash_format
    CHECK (root_hash ~ '^0x[0-9a-f]{64}$'),

  CONSTRAINT integrity_anchors_previous_hash_format
    CHECK (previous_hash IS NULL OR previous_hash ~ '^0x[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS integrity_anchors_target_created_idx
ON public.integrity_anchors(target_table, created_at DESC);

-- Batch ordering index (for performance)
CREATE INDEX IF NOT EXISTS audit_logs_created_at_id_idx
ON public.audit_logs(created_at, id);

-- 2) RLS (Function Signature Independent)
ALTER TABLE public.integrity_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view integrity_anchors" ON public.integrity_anchors;
CREATE POLICY "Admins can view integrity_anchors" ON public.integrity_anchors
FOR SELECT USING (
  -- 함수 시그니처 충돌 방지를 위해 직접 서브쿼리 사용
  (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()) = true
);

REVOKE ALL ON TABLE public.integrity_anchors FROM anon, authenticated;
GRANT SELECT ON TABLE public.integrity_anchors TO authenticated;
GRANT ALL ON TABLE public.integrity_anchors TO service_role;

-- 3) Snapshot + Anchor RPC (Race-Safe Version)
CREATE OR REPLACE FUNCTION public.anchor_audit_logs_snapshot()
RETURNS TABLE (
  anchor_id UUID,
  count INTEGER,
  hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_prev_hash TEXT;
  v_cutoff TIMESTAMPTZ;
  v_batch_end TIMESTAMPTZ := NOW(); -- ★ Fix Batch Boundary
  v_count INTEGER := 0;
  v_start UUID;
  v_end UUID;
  v_root_hex TEXT;
  v_root TEXT;
BEGIN
  -- ★ Prevent Concurrent Execution (Advisory Lock)
  PERFORM pg_advisory_xact_lock(hashtext('anchor_audit_logs_snapshot'));

  -- Find Last Anchor
  SELECT ia.root_hash, ia.created_at
    INTO v_prev_hash, v_cutoff
  FROM public.integrity_anchors ia
  WHERE ia.target_table = 'audit_logs'
  ORDER BY ia.created_at DESC
  LIMIT 1;

  IF v_cutoff IS NULL THEN
    v_cutoff := 'epoch'::timestamptz; -- Genesis
  END IF;

  -- Scope: (v_cutoff, v_batch_end]
  SELECT COUNT(*)
    INTO v_count
  FROM public.audit_logs
  WHERE created_at > v_cutoff
    AND created_at <= v_batch_end;

  IF v_count = 0 THEN
    anchor_id := NULL;
    count := 0;
    hash := NULL;
    RETURN;
  END IF;

  -- Identify Start/End IDs safely
  SELECT id INTO v_start
  FROM public.audit_logs
  WHERE created_at > v_cutoff AND created_at <= v_batch_end
  ORDER BY created_at, id
  LIMIT 1;

  SELECT id INTO v_end
  FROM public.audit_logs
  WHERE created_at > v_cutoff AND created_at <= v_batch_end
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  -- Calculate Hash Chain (SHA-256)
  WITH ordered AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn,
      extensions.digest(
        concat_ws(
          '|',
          id::text,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          table_name,
          record_id::text,
          action::text,
          COALESCE(changed_by::text,''),
          COALESCE(old_data::text,''),
          COALESCE(new_data::text,'')
        ),
        'sha256'
      ) AS leaf
    FROM public.audit_logs
    WHERE created_at > v_cutoff
      AND created_at <= v_batch_end
    ORDER BY created_at, id
  ),
  recur AS (
    SELECT
      0 AS rn,
      decode(
        substring(COALESCE(v_prev_hash, '0x' || repeat('0', 64)) FROM 3),
        'hex'
      ) AS h
    UNION ALL
    SELECT
      o.rn,
      extensions.digest(r.h || o.leaf, 'sha256') AS h
    FROM recur r
    JOIN ordered o ON o.rn = r.rn + 1
  )
  SELECT encode(h, 'hex')
    INTO v_root_hex
  FROM recur
  ORDER BY rn DESC
  LIMIT 1;

  v_root := '0x' || v_root_hex;

  INSERT INTO public.integrity_anchors (
    target_table,
    start_record_id,
    end_record_id,
    record_count,
    root_hash,
    previous_hash,
    created_at
  )
  VALUES (
    'audit_logs',
    v_start,
    v_end,
    v_count,
    v_root,
    v_prev_hash,
    v_batch_end -- ★ Use Fixed Boundary as Timestamp
  )
  RETURNING id INTO anchor_id;

  count := v_count;
  hash := v_root;
  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anchor_audit_logs_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anchor_audit_logs_snapshot() TO service_role;
