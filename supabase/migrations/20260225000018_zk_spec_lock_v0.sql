BEGIN;

-- 0) event_receipts는 트리거 절대 금지 (검증은 쿼리로만)
-- (운영 규칙) 아래 SELECT 결과는 반드시 [] 여야 함:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='event_receipts';

-- 1) ZK commitment_scheme v0 완전 고정
DO $$
BEGIN
  -- zk_event_receipts
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='zk_event_receipts'
  ) THEN
    EXECUTE $exec$UPDATE public.zk_event_receipts
             SET commitment_scheme='KECCAK_PLACEHOLDER_V0'
             WHERE commitment_scheme IS DISTINCT FROM 'KECCAK_PLACEHOLDER_V0'$exec$;

    EXECUTE $exec$ALTER TABLE public.zk_event_receipts
             ALTER COLUMN commitment_scheme SET DEFAULT 'KECCAK_PLACEHOLDER_V0'$exec$;

    BEGIN
      EXECUTE $exec$ALTER TABLE public.zk_event_receipts
               ADD CONSTRAINT zk_event_receipts_commitment_scheme_chk
               CHECK (commitment_scheme = 'KECCAK_PLACEHOLDER_V0')$exec$;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- zk_rollup_batches
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='zk_rollup_batches'
  ) THEN
    EXECUTE $exec$UPDATE public.zk_rollup_batches
             SET commitment_scheme='KECCAK_PLACEHOLDER_V0'
             WHERE commitment_scheme IS DISTINCT FROM 'KECCAK_PLACEHOLDER_V0'$exec$;

    EXECUTE $exec$ALTER TABLE public.zk_rollup_batches
             ALTER COLUMN commitment_scheme SET DEFAULT 'KECCAK_PLACEHOLDER_V0'$exec$;

    BEGIN
      EXECUTE $exec$ALTER TABLE public.zk_rollup_batches
               ADD CONSTRAINT zk_rollup_batches_commitment_scheme_chk
               CHECK (commitment_scheme = 'KECCAK_PLACEHOLDER_V0')$exec$;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2) ZK 테이블: service_role only write 유지 (운영자 레버는 API로)
-- (이미 defuse에서 했을 수 있지만, “존재하면” 재적용)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['zk_event_registry','zk_event_receipts','zk_rollup_batches','zk_rollup_submissions','zk_nullifiers','zk_commitments','zk_proofs'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);

      -- 기존 정책 싹 다 제거 후 service_role policy 단일화 (B0-2 규칙)
      EXECUTE format('DROP POLICY IF EXISTS "%I select all" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I select own hash" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I no client write" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I no client update" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I_no_mutation" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I_no_insert" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "%I_service_role_all" ON public.%I', t, t);

      EXECUTE format(
        'CREATE POLICY "%I_service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
