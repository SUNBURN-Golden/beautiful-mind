-- user_wallets 테이블은 기본키가 user_id (UUID) 이며 id 컬럼이 존재하지 않으므로, 범용 audit_logs 트리거와 충돌합니다.
-- 토큰 변동의 원천 증명은 이미 token_ledger 가 완벽하게 수행하므로, 캐시 테이블인 user_wallets 에서 이 트리거를 제외시킵니다.
DROP TRIGGER IF EXISTS audit_user_wallets_trigger ON public.user_wallets;
