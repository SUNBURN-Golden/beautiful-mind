-- 1) treasury_wallet은 id가 SMALLINT이므로 범용 UUID audit_logs에 삽입 불가
DROP TRIGGER IF EXISTS audit_treasury_wallet_trigger ON public.treasury_wallet;

-- 2) soul_airdrop_claims는 기본키가 claim_no 이고 id 컬럼이 없으므로 범용 audit 불가
DROP TRIGGER IF EXISTS audit_soul_airdrop_claims_trigger ON public.soul_airdrop_claims;

-- 본원 장부인 token_ledger와 token_holds 에는 id(UUID)가 있으므로 감사 로그가 정상 작동함.
