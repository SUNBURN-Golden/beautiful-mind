-- Phase 1.2.1 Additive Patch: Vault Tracking & Counterparty Formalization

-- 1. Redefine Treasury Sync Trigger to route into Specific Vaults based on token_ledger meta->'vault'
CREATE OR REPLACE FUNCTION public.sync_treasury_on_ledger_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vault text;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Update generic aggregate singleton
  INSERT INTO public.treasury_wallet(id, balance, updated_at)
  VALUES (1, NEW.amount, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    balance = public.treasury_wallet.balance + EXCLUDED.balance,
    updated_at = NOW();

  -- Update specific vault if explicitly tagged in meta
  IF NEW.meta ? 'vault' THEN
    BEGIN
      v_vault := NEW.meta->>'vault';
      INSERT INTO public.treasury_vaults(vault, balance, updated_at)
      VALUES (v_vault::public.soul_vault_type, NEW.amount, NOW())
      ON CONFLICT (vault)
      DO UPDATE SET
        balance = public.treasury_vaults.balance + EXCLUDED.balance,
        updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore if enum cast fails to preserve ledger append-only safety
    END;
  END IF;

  RETURN NEW;
END $$;

-- 2. Update slash_fraud_docs to explicitly append counterparty and vault metadata
CREATE OR REPLACE FUNCTION public.slash_fraud_docs(
    p_verification_id UUID,
    p_user_id UUID,
    p_slash_amount BIGINT DEFAULT 1000
) RETURNS JSONB AS $$
DECLARE
    v_current_balance BIGINT;
    v_actual_slash BIGINT;
BEGIN
    SELECT balance INTO v_current_balance FROM public.user_wallets WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        v_current_balance := 0;
    END IF;

    v_actual_slash := LEAST(v_current_balance, p_slash_amount);
    
    IF v_actual_slash > 0 THEN
        BEGIN
            INSERT INTO public.token_ledger (
                user_id, amount, type, related_id, idempotency_key, meta
            ) VALUES (
                p_user_id,
                -v_actual_slash,
                'SLASHING_BURN',
                p_verification_id,
                'SLASH_FRAUD_DOCS:' || p_verification_id,
                jsonb_build_object('reason', 'FRAUD_DOCS', 'counterparty', 'TREASURY', 'vault', 'INSURANCE')
            );
        EXCEPTION WHEN unique_violation THEN
            RETURN jsonb_build_object('status', 'IDEMPOTENT_SKIPPED', 'actual_slash', 0);
        END;

        INSERT INTO public.token_ledger (
            user_id, amount, type, related_id, idempotency_key, meta
        ) VALUES (
            NULL,
            v_actual_slash,
            'INSURANCE_CREDIT',
            p_verification_id,
            'INSURANCE_CREDIT_FRAUD_DOCS:' || p_verification_id,
            jsonb_build_object('reason', 'FRAUD_DOCS_COLLECTED', 'counterparty', p_user_id, 'vault', 'INSURANCE')
        );

        INSERT INTO public.compensation_cases (
            case_type, offender_user_id, verification_id, pool_amount, status
        ) VALUES (
            'FRAUD_DOCS', p_user_id, p_verification_id, v_actual_slash, 'OPEN'
        );
    END IF;

    RETURN jsonb_build_object('status', 'SLASHED', 'actual_slash', v_actual_slash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
