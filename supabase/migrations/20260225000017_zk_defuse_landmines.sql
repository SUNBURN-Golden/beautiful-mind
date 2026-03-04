-- Phase 4.2++ Defusal: ZK Landmines and SSOT Mutability Fixes

BEGIN;

-- 1) Remove invalid triggers/functions from `event_receipts`
DROP TRIGGER IF EXISTS trigger_capture_event_receipt_meta ON public.event_receipts;
DROP FUNCTION IF EXISTS public.capture_event_receipt_meta();

-- 2) Fix RLS Policies for ZK Tables (service_role ONLY)

-- Helper pattern:
-- - Ensure RLS enabled
-- - Revoke all from PUBLIC/anon/authenticated
-- - Grant table privileges to service_role
-- - Create a single ALL-policy for service_role

-- A) zk_event_registry
ALTER TABLE public.zk_event_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zk_event_registry_select" ON public.zk_event_registry;
DROP POLICY IF EXISTS "zk_event_registry_no_mutation" ON public.zk_event_registry;
DROP POLICY IF EXISTS "zk_event_registry_service_role_all" ON public.zk_event_registry;

REVOKE ALL ON TABLE public.zk_event_registry FROM PUBLIC;
REVOKE ALL ON TABLE public.zk_event_registry FROM anon, authenticated;

GRANT ALL ON TABLE public.zk_event_registry TO service_role;

CREATE POLICY "zk_event_registry_service_role_all" ON public.zk_event_registry
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- B) zk_event_receipts
ALTER TABLE public.zk_event_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zk_event_receipts_select" ON public.zk_event_receipts;
DROP POLICY IF EXISTS "zk_event_receipts_no_insert" ON public.zk_event_receipts;
DROP POLICY IF EXISTS "zk_event_receipts_service_role_all" ON public.zk_event_receipts;

REVOKE ALL ON TABLE public.zk_event_receipts FROM PUBLIC;
REVOKE ALL ON TABLE public.zk_event_receipts FROM anon, authenticated;

GRANT ALL ON TABLE public.zk_event_receipts TO service_role;

CREATE POLICY "zk_event_receipts_service_role_all" ON public.zk_event_receipts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- C) zk_rollup_batches
ALTER TABLE public.zk_rollup_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zk_rollup_batches_select" ON public.zk_rollup_batches;
DROP POLICY IF EXISTS "zk_rollup_batches_no_insert" ON public.zk_rollup_batches;
DROP POLICY IF EXISTS "zk_rollup_batches_service_role_all" ON public.zk_rollup_batches;

REVOKE ALL ON TABLE public.zk_rollup_batches FROM PUBLIC;
REVOKE ALL ON TABLE public.zk_rollup_batches FROM anon, authenticated;

GRANT ALL ON TABLE public.zk_rollup_batches TO service_role;

CREATE POLICY "zk_rollup_batches_service_role_all" ON public.zk_rollup_batches
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- D) zk_rollup_submissions
ALTER TABLE public.zk_rollup_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zk_rollup_submissions_select" ON public.zk_rollup_submissions;
DROP POLICY IF EXISTS "zk_rollup_submissions_no_insert" ON public.zk_rollup_submissions;
DROP POLICY IF EXISTS "zk_rollup_submissions_service_role_all" ON public.zk_rollup_submissions;

REVOKE ALL ON TABLE public.zk_rollup_submissions FROM PUBLIC;
REVOKE ALL ON TABLE public.zk_rollup_submissions FROM anon, authenticated;

GRANT ALL ON TABLE public.zk_rollup_submissions TO service_role;

CREATE POLICY "zk_rollup_submissions_service_role_all" ON public.zk_rollup_submissions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
