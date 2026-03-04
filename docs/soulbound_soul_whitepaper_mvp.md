# SoulBound MVP Whitepaper (Concept + Spec Lock)

## 0. 문서 메타
- 문서명: SoulBound MVP Whitepaper (SOUL Credits + Trust SBT)
- 버전: v1.0
- 기준일: 2026-03-04
- 범위: SoulBound MVP의 신뢰 배지(SBT), SOUL Credits 토크노믹스, 원장 무결성, 감사/제재 절차
- 성격: 투자/마케팅 문서가 아니라 구현 계약 문서(Engineering Spec Lock)

---

## 1. 문제정의와 목표
SoulBound의 핵심 문제는 "자기 주장(Claim)"과 "검증된 신뢰(Verified Trust)"를 구분하지 않으면 플랫폼 신뢰가 붕괴된다는 점이다.

MVP 목표는 다음 4가지를 동시에 만족하는 것이다.
1. 빠른 런칭: 사용자가 즉시 발급 가능한 low-trust 배지 제공
2. 검증된 승급: audit/challenge 통과 시에만 high-trust 승급 허용
3. 경제적 책임: 담보(collateral) 기반 위약벌/슬래싱 경로 제공
4. 원장 무결성: 모든 상태변경을 append-only ledger + audit anchor로 추적 가능하게 유지

---

## 2. 핵심 원칙 (Non-Negotiables)

### 2.1 원장 불변성
- `token_ledger`는 append-only 원장이다.
- UPDATE/DELETE는 DB 트리거 레벨에서 차단한다.
- 잔액(`user_wallets`, `treasury_wallet`, `treasury_vaults`)은 캐시이며, 진실의 원천은 항상 `token_ledger`다.

### 2.2 절차적 제재 (Due Process)
- 자동 슬래싱 금지.
- 제재는 반드시 다음 절차를 따른다.
  - Freeze -> 통지/소명 -> 확정(Finalized) -> 집행(Executed)
- 절차 상태는 `enforcement_actions.due_process_state`로 기록한다.

### 2.3 High-Trust 승급 제약
- high-trust는 임의 승급이 아니라 audit/challenge 경로 통과로만 허용한다.
- `sbt_claims`에 provenance(`source_audit_id`, `source_challenge_id`)가 강제된다.

### 2.4 무결성/포함증명 우선
- 현 단계 ZK/L1은 "정당성 판결" 수단이 아니라 "원장 포함증명/무결성 증명" 수단으로 사용한다.
- 개인정보/원문 텍스트는 L1에 올리지 않는다.

---

## 3. 시스템 모델 개요

### 3.1 신뢰 배지 (SBT) 모델
- low-trust: self-claim 기반 발급 (`issuer=SELF`)
- high-trust: audit/challenge PASS 기반 승급 (`issuer=AUDIT|CHALLENGE`)
- 상태: `PENDING | ACTIVE | FROZEN | DISHONORED | REVOKED`

### 3.2 SOUL Credits 모델
- 명칭: SOUL Credits (`SOUL`)
- 단위: 정수형, `0 decimals`
- 원장 기록 단위: `token_ledger`의 `amount`와 `type`

### 3.3 담보/에스크로 모델
- 담보 계정: `collateral_accounts`
- 보류 에스크로: `token_holds`
- 담보 이벤트 타입:
  - `COLLATERAL_DEPOSIT`
  - `COLLATERAL_REFUND`
  - `COLLATERAL_SLASH`

### 3.4 감사/분쟁/제재 모델
- 감사: `audits` (`RANDOM | CHALLENGE`)
- 분쟁: `challenges`
- 제재: `enforcement_actions` (`FREEZE | PENALTY | SLASH | REVOKE_SBT`)

---

## 4. 상태머신

### 4.1 SBT 상태머신 (요약)
1. self-claim -> `LOW + ACTIVE`
2. random audit/challenge open -> `FROZEN`
3. decide PASS -> `HIGH + ACTIVE`
4. decide FAIL -> `DISHONORED` + (슬래시/리보크 집행 대기)
5. 집행 후 필요 시 `REVOKED`

### 4.2 Due Process 상태머신
1. `NOTIFIED`: Freeze/제재 통지
2. `RESPONDED`: 소명 수신(선택적)
3. `FINALIZED`: 운영자/정책 엔진 확정
4. `EXECUTED`: 슬래시/리보크 실제 집행 완료

---

## 5. 토크노믹스 회계 구조

### 5.1 거래 유형 (`soul_tx_type`)
- 기본: `AIRDROP`, `REWARD_MINT`, `GAS_FEE_BURN`, `GAS_FEE_TIP`
- 국고: `TREASURY_GRANT`, `TREASURY_SPEND`
- 제재/보상: `SLASHING_BURN`, `SLASHING_COMPENSATE`, `INSURANCE_CREDIT`
- 담보: `COLLATERAL_DEPOSIT`, `COLLATERAL_REFUND`, `COLLATERAL_SLASH`

### 5.2 국고 분리
- `treasury_vaults`: `OPS | REWARD | INSURANCE | EXPERIMENT`
- `treasury_budgets`: 기간별 outflow cap 관리 테이블

### 5.3 예치금 정책 플래그
- `COLLATERAL_REQUIRED_ON_SIGNUP`
- `COLLATERAL_REQUIRED_FOR_HIGH_TRUST`

---

## 6. API/권한 모델

### 6.1 사용자 엔드포인트 (cookie session)
- `POST /api/sbt/self-claim`
- `POST /api/collateral/deposit`
- `POST /api/challenge/open`

### 6.2 관리자/크론 엔드포인트
- `POST /api/audit/random/open`
- `POST /api/audit/decide`
- `POST /api/enforcement/execute`
- 인증: `x-cron-secret` + service role 백엔드 클라이언트

### 6.3 SSOT
- `GET /api/me/status`에서 trust/sbt/freeze/audit 진행 상태를 노출
- Guarded 라우팅은 SSOT를 기준으로 접근 제어

---

## 7. 무결성/포함증명 계층 (ZK/L1 경계)

### 7.1 감사로그 -> 스냅샷 -> 앵커
1. 주요 테이블 변경 이벤트를 `audit_logs`에 기록
2. `event_receipts`로 정규화 및 해시화
3. `merkle_anchors` 루트 생성
4. 필요 시 `anchor_submissions`로 커밋 이력 관리

### 7.2 개인정보 보호 원칙
- 원문 payload는 외부 커밋 대상에서 제거
- canonical text/hash 중심으로 무결성 검증

### 7.3 운영 기본값
- ZK 관련 라우트는 feature flag (`ZK_ROUTES_ENABLED`) 기본 OFF
- CRON 전용 호출로 운영 안전성 확보

---

## 8. 보안/운영 정책
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 프론트 노출 금지
- RLS는 기본 차단, 서버 경유 최소 권한 원칙 적용
- 멱등성 키(`idempotency_key`)로 중복 집행 방지
- 원장 정합성 검증 시 캐시가 아닌 `token_ledger` 합을 기준으로 판단

---

## 9. KPI (MVP 완료 기준)
1. low-trust self-claim 발급 성공률
2. audit/challenge PASS 후 high-trust 승급 E2E 성공률
3. 원장 이벤트 누락률 (`token_ledger`, `audit_logs`, `anchors`) 0
4. 제재 집행의 due-process 준수율 100%

---

## 10. 구현 매핑 (현재 코드 기준)

### 10.1 DB 마이그레이션
- `supabase/migrations/20260225000000_private_ledger.sql`
- `supabase/migrations/20260225000003_soul_upgrade.sql`
- `supabase/migrations/20260227000000_trust_sbt_pipeline.sql`
- `supabase/migrations/20260228010000_audit_challenge_atomic_open.sql`
- `supabase/migrations/20260302000000_audit_decide_atomic.sql`

### 10.2 웹 API
- `apps/web/app/api/sbt/self-claim/route.ts`
- `apps/web/app/api/collateral/deposit/route.ts`
- `apps/web/app/api/challenge/open/route.ts`
- `apps/web/app/api/audit/random/open/route.ts`
- `apps/web/app/api/audit/decide/route.ts`
- `apps/web/app/api/enforcement/execute/route.ts`
- `apps/web/app/api/me/status/route.ts`
- `apps/web/app/api/integrity/snapshot/route.ts`
- `apps/web/app/api/integrity/merkle-snapshot/route.ts`

### 10.3 E2E 시나리오
- `apps/web/tests/e2e/onboarding-real.spec.ts`
  - self-claim -> low-trust
  - random audit -> freeze -> decide(pass) -> high-trust

---

## 11. 범위 경계 (MVP vs V2)

### MVP (이 문서 확정 범위)
- 중앙 원장 기반 신뢰/제재/담보 파이프라인
- 무결성 앵커(포함증명) 생성
- 운영 수동/크론 집행

### V2 (후속)
- L1 실커밋 자동화/검증자 도구 확장
- 예산캡(`treasury_budgets`) 실시간 차단 로직 강화
- 토큰 정책 자동 리밸런싱/경제 시뮬레이터 고도화

---

## 12. 면책 및 해석 원칙
- 본 문서는 투자 권유 문서가 아니다.
- 법률/규제 해석은 별도 법무 검토 문서가 우선한다.
- 구현 충돌 시 원칙 우선순위:
  1. 원장 불변성
  2. due process 절차
  3. provenance 강제(high-trust)
  4. 개인정보 최소노출

