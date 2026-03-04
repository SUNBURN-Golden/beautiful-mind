-- Additive Patch for Phase 5 Lazy Commitment Policy v1

-- 1. Index for fast 30-day sliding window aggregate calculations on UNLOCK_FEE_BURN
CREATE INDEX IF NOT EXISTS event_receipts_type_time_idx 
ON public.event_receipts(event_type, occurred_at);

-- 2. Alter anchor_submissions (Safe Additions)
-- Set chain_id to identify Ethereum vs Layer 2s, default 1 (Mainnet)
ALTER TABLE public.anchor_submissions 
ADD COLUMN IF NOT EXISTS chain_id INT NOT NULL DEFAULT 1;

-- Tx tracking can be delayed depending on network state
ALTER TABLE public.anchor_submissions 
ALTER COLUMN tx_hash DROP NOT NULL,
ALTER COLUMN network DROP NOT NULL;

-- Blockchain specific tracing
ALTER TABLE public.anchor_submissions
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS block_number INT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Constrain status to known L1 progression states
ALTER TABLE public.anchor_submissions
DROP CONSTRAINT IF EXISTS anchor_submissions_status_check;

ALTER TABLE public.anchor_submissions
ADD CONSTRAINT anchor_submissions_status_check 
CHECK (status IN ('PENDING', 'SUBMITTED', 'SKIPPED', 'FAILED'));

-- 3. Idempotency Constraint for API (one submission per chain per anchor)
ALTER TABLE public.anchor_submissions 
ADD CONSTRAINT anchor_submissions_anchor_chain_key UNIQUE (anchor_id, chain_id);
