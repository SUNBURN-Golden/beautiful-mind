-- Add foreign key constraint to zk_proofs for batch_id

ALTER TABLE public.zk_proofs
  ADD CONSTRAINT zk_proofs_batch_id_fkey
  FOREIGN KEY (batch_id)
  REFERENCES public.zk_rollup_batches(id)
  ON DELETE CASCADE;
