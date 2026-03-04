-- Phase 1.2 Additive Patch: Fraud Docs Liquidated Damages Scaffold (Refined)

-- 1. Extend soul_tx_type Enum for the 2-legged accounting
ALTER TYPE public.soul_tx_type ADD VALUE IF NOT EXISTS 'INSURANCE_CREDIT';

-- 2. Alter verifications to add adjudication_reason (status remains 'REJECTED')
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS adjudication_reason TEXT;

-- 3. Alter profiles to support banning
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- 4. Create minimum Scaffold for Phase 3 Insurance/Compensation Pool
CREATE TABLE IF NOT EXISTS public.compensation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type TEXT NOT NULL,
    offender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
    pool_amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('OPEN','READY','PAID','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compensation_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.compensation_cases(id) ON DELETE CASCADE,
    beneficiary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','PAID')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.compensation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensation_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases no client write" ON public.compensation_cases FOR ALL USING (false);
CREATE POLICY "allocs no client write" ON public.compensation_allocations FOR ALL USING (false);

-- 5. RPC Function: slash_fraud_docs (Atomic 2-legged execution)
CREATE OR REPLACE FUNCTION public.slash_fraud_docs(
    p_verification_id UUID,
    p_user_id UUID,
    p_slash_amount BIGINT DEFAULT 1000
) RETURNS JSONB AS $$
DECLARE
    v_current_balance BIGINT;
    v_actual_slash BIGINT;
BEGIN
    -- 1. Get current balance from user_wallets cache
    SELECT balance INTO v_current_balance FROM public.user_wallets WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        v_current_balance := 0;
    END IF;

    -- 2. Calculate actual slash (partial debit if insufficient funds)
    v_actual_slash := LEAST(v_current_balance, p_slash_amount);
    
    IF v_actual_slash > 0 THEN
        -- 3. Debit User
        BEGIN
            INSERT INTO public.token_ledger (
                user_id, amount, type, related_id, idempotency_key, meta
            ) VALUES (
                p_user_id,
                -v_actual_slash,
                'SLASHING_BURN',
                p_verification_id,
                'SLASH_FRAUD_DOCS:' || p_verification_id,
                jsonb_build_object('reason', 'FRAUD_DOCS')
            );
        EXCEPTION WHEN unique_violation THEN
            -- Idempotency hit
            RETURN jsonb_build_object('status', 'IDEMPOTENT_SKIPPED', 'actual_slash', 0);
        END;

        -- 4. Credit Treasury/Insurance Vault (token_ledger user_id=NULL)
        INSERT INTO public.token_ledger (
            user_id, amount, type, related_id, idempotency_key, meta
        ) VALUES (
            NULL,
            v_actual_slash,
            'INSURANCE_CREDIT',
            p_verification_id,
            'INSURANCE_CREDIT_FRAUD_DOCS:' || p_verification_id,
            jsonb_build_object('reason', 'FRAUD_DOCS_COLLECTED')
        );

        -- 5. Create compensation case scaffold
        INSERT INTO public.compensation_cases (
            case_type, offender_user_id, verification_id, pool_amount, status
        ) VALUES (
            'FRAUD_DOCS', p_user_id, p_verification_id, v_actual_slash, 'OPEN'
        );
    END IF;

    RETURN jsonb_build_object('status', 'SLASHED', 'actual_slash', v_actual_slash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
