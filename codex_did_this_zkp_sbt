# codex_did_this_zkp_sbt

작성일: 2026-02-28
작업 기준 브랜치: `main` (working tree)
보고 범위: SoulBound MVP `zkp_sbt` 정책 반영 (fcqs 중심), 웹앱 API/SSOT/Guarded/E2E 연동

## 1) DB 변경(마이그레이션) 목록 + 핵심 DDL

### 1-1. 신규 마이그레이션
- 파일: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql`

### 1-2. 핵심 DDL/제약 (코드 근거)
- `soul_tx_type` 확장: `COLLATERAL_DEPOSIT`, `COLLATERAL_REFUND`, `COLLATERAL_SLASH`
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:9-11`
- feature flags seed
  - `COLLATERAL_REQUIRED_ON_SIGNUP`, `COLLATERAL_REQUIRED_FOR_HIGH_TRUST`, `ZK_ROUTES_ENABLED`(default false)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:75-79`
- SBT 상태 모델
  - `sbt_claims` 생성 (trust_level/status/issuer/source_audit_id/source_challenge_id/issued_at/revoked_at)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:84`
- Audit/Challenge 모델
  - `audits` 생성 (audit_type/state/subject_user_id/claim_id/challenge_id/decided_at/decision_by)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:106`
  - `challenges` 생성 (challenger/subject/claim/evidence_ref/state/audit_id)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:124`
- Collateral 모델
  - `collateral_accounts` 생성 (balance/total_deposited/total_refunded/total_slashed/last_ledger_id)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:142`
- Due-process enforcement 모델
  - `enforcement_actions` 생성 (FREEZE|PENALTY|SLASH|REVOKE_SBT + due_process_state)
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:160`
- HIGH 신뢰 승급 경로 강제
  - trigger function `enforce_sbt_claim_rules()`로 HIGH는 AUDIT/CHALLENGE provenance 필수
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:257`
- 원장 append-only 정합
  - collateral 입/환급/슬래시를 `token_ledger`로만 기록하는 RPC
  - `apply_collateral_deposit`: `...:291`
  - `apply_collateral_slash`: `...:433`
  - `execute_enforcement_action`: `...:509`
- 감사/앵커 포함 보장
  - 신규 테이블들에 `log_audit_event()` 트리거 연결
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:700`, `:720`

## 2) API 목록/스펙 (입력/출력/권한)

### 2-1. 사용자 엔드포인트 (cookie session)
- `POST /api/sbt/self-claim`
  - 파일: `apps/web/app/api/sbt/self-claim/route.ts:9`
  - 입력: `{ claim_type, claim_payload? }`
  - 출력: `{ success: true, claim }` 또는 에러
  - 권한: 세션 유저 필수 (`AUTH_REQUIRED` 401)
  - 정책: `COLLATERAL_REQUIRED_ON_SIGNUP` true일 때 담보 없으면 409
  - 근거: `.../self-claim/route.ts:13`, `:30`, `:41`

- `POST /api/collateral/deposit`
  - 파일: `apps/web/app/api/collateral/deposit/route.ts:9`
  - 입력: `{ amount, idempotency_key? }`
  - 출력: `{ success: true, result }`
  - 권한: 세션 유저 필수
  - 처리: `apply_collateral_deposit` RPC 호출
  - 근거: `.../deposit/route.ts:13`, `:30`

- `POST /api/challenge/open`
  - 파일: `apps/web/app/api/challenge/open/route.ts:11`
  - 입력: `{ subject_user_id, claim_id, evidence_ref, note? }`
  - 출력: `{ success, challenge_id, audit_id, freeze_action }`
  - 권한: 세션 유저 필수
  - 처리: challenge+audit 생성, claim/profile freeze, FREEZE enforcement 생성

### 2-2. 관리자/크론 전용 엔드포인트
- 공통 보안 유틸
  - 파일: `apps/web/lib/server/trust.ts`
  - `hasValidCronSecret`, `isAdminUser`, `getServiceRoleClient`
  - 근거: `apps/web/lib/server/trust.ts:12`, `:23`, `:42`

- `POST /api/audit/random/open`
  - 파일: `apps/web/app/api/audit/random/open/route.ts:25`
  - 입력: `{ subject_user_id, claim_id, note? }`
  - 출력: `{ success, audit_id, freeze_action }`
  - 권한: `x-cron-secret` 또는 admin session
  - 처리: audit OPEN/FROZEN + profile freeze + FREEZE action

- `POST /api/audit/decide`
  - 파일: `apps/web/app/api/audit/decide/route.ts:32`
  - 입력: `{ audit_id, decision: PASS|FAIL, slash_amount?, note? }`
  - 출력: PASS 시 HIGH 승급 응답 / FAIL 시 enforcement queue 응답
  - 권한: `x-cron-secret` 또는 admin session
  - 정책:
    - PASS 시 `COLLATERAL_REQUIRED_FOR_HIGH_TRUST` true + 담보 부족이면 409
      - 근거: `.../decide/route.ts:108`, `:129`
    - PASS 시 `trust_level: HIGH`
      - 근거: `.../decide/route.ts:141`, `:185`

- `POST /api/enforcement/execute`
  - 파일: `apps/web/app/api/enforcement/execute/route.ts:24`
  - 입력: `{ action_id? , limit? }`
  - 출력: `{ success, requested, executed, results[] }`
  - 권한: `x-cron-secret` 또는 admin session
  - 처리: `execute_enforcement_action` RPC로 FINALIZED action 집행
  - 근거: `.../execute/route.ts:74`

## 3) SSOT / GuardedLayout 변경 요약

### 3-1. SSOT 확장 (`/api/me/status`)
- 파일: `apps/web/app/api/me/status/route.ts`
- 추가 meta:
  - `trust_level`, `sbt_status`, `sbt_claim_type`, `sbt_issuer`, `sbt_issued_at`
  - `is_frozen`, `freeze_reason`
  - `audit_in_progress`, `open_audit_count`
- blocker 추가:
  - frozen 시 `ACCOUNT_FROZEN`
- 근거: `.../me/status/route.ts:66`, `:78-79`, `:174`, `:217-225`

### 3-2. Guarded 라우팅
- 서버 미들웨어
  - 파일: `apps/web/utils/supabase/middleware.ts`
  - `/banned` 보호 라우트 포함, frozen면 `/banned` 강제 리다이렉트, 해제 시 `/dashboard` 복귀
  - 근거: `.../middleware.ts:39`, `:54`, `:67-74`
- 클라이언트 가드
  - 파일: `apps/web/components/ssot-route-guard.tsx`
  - SSOT 기반 frozen/expected route 동기화
  - 근거: `.../ssot-route-guard.tsx:12`, `:22-24`, `:28`, `:39`
- guarded layout에 가드 주입
  - 파일: `apps/web/app/(guarded)/layout.tsx:1`, `:9`

### 3-3. Dashboard 반영
- 파일: `apps/web/app/(guarded)/dashboard/page.tsx`
- 표시/테스트 ID:
  - `trust-level-badge`, `sbt-status-badge`, `audit-progress-badge`
- 근거: `.../dashboard/page.tsx:19-21`, `:51`, `:59`

## 4) ZK/L1 연동 포인트 (무결성/포함증명 기준)

### 4-1. 원장/감사 로그 포함
- 신규 SBT/audit/challenge/collateral/enforcement 테이블에 audit trigger 연결
  - 근거: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:700`, `:720`
- 즉, SBT 상태변경/제재 상태변경은 `audit_logs` 경유로 anchor 입력 집합에 포함됨.

### 4-2. Anchor 생성/커밋 경로 (기존 코드 근거)
- hash-chain snapshot RPC
  - `public.anchor_audit_logs_snapshot()` 정의
  - 근거: `supabase/migrations/20260224060000_integrity_setup.sql:53`
- cron API snapshot 실행
  - 파일: `apps/web/app/api/integrity/snapshot/route.ts:27`
- merkle snapshot (event_receipts + merkle_anchors)
  - 파일: `apps/web/app/api/integrity/merkle-snapshot/route.ts:87-94`, `:248-261`
- weekly commit skeleton (anchor_submissions upsert)
  - 파일: `apps/web/app/api/integrity/cron-weekly-commit/route.ts:12-19`, `:80-85`

### 4-3. ZK route 운영 안전장치
- CRON secret 체크 유지
  - `apps/web/app/api/zk/commitments/snapshot/route.ts:17-20`
  - `apps/web/app/api/zk/rollup/prepare/route.ts:16-19`
- feature flag `ZK_ROUTES_ENABLED` default OFF 강제
  - DB seed: `supabase/migrations/20260227000000_trust_sbt_pipeline.sql:79`
  - runtime check:
    - `apps/web/app/api/zk/commitments/snapshot/route.ts:22-29`
    - `apps/web/app/api/zk/rollup/prepare/route.ts:22-29`

## 5) E2E/CI 검증 결과 (실행 커맨드 근거)

### 5-1. 정적 검증
- 실행: `pnpm --filter web exec eslint ...` (변경 파일 대상)
- 결과: 통과
- 실행: `pnpm --filter web exec tsc --noEmit`
- 결과: 통과

### 5-2. 빌드
- 실행: `pnpm --filter web build`
- 결과: 실패
- 실패 원인: 코드 에러가 아닌 외부 네트워크 차단으로 Google Fonts(Geist/Geist Mono) fetch 실패

### 5-3. E2E(remote)
- 실행: `pnpm --filter web test:e2e:remote`
- 결과: 시드 단계 실패
- 실패 원인: `remote_e2e_seed.mjs`에서 Supabase 도메인 DNS 해석 실패
  - `getaddrinfo ENOTFOUND cjmnidnjbnfvqlzmekmc.supabase.co`
- 참고: 스크립트 구조상 cleanup이 뒤이어 실행되어 쉘 종료코드가 0으로 보일 수 있으나, 실제 seed 실패 로그가 존재함.

### 5-4. 신규 E2E 시나리오 추가 근거
- 파일: `apps/web/tests/e2e/onboarding-real.spec.ts`
- `Trust SBT Flow (fcqs-backed)` 추가
  - `self-claim -> low-trust issuance -> dashboard reflection`
  - `random audit -> freeze -> decide(pass) -> high-trust promotion`
- SSOT 폴링 패턴: `expect.poll` 사용
- 근거: `.../onboarding-real.spec.ts:305`, `:308`, `:349`, `:330`, `:389`, `:416`

## 6) 리스크/엣지 케이스 (코드 기반)

- `audit/decide(PASS)`에서 collateral-required 정책이 true이고 담보 0이면 HIGH 승급이 409로 차단됨
  - 근거: `apps/web/app/api/audit/decide/route.ts:108-132`
- `challenge/open`, `audit/random/open`은 다중 호출 시 중복 freeze action 관리가 idempotency_key에 의존
  - 근거: 각 route의 `idempotency_key` 삽입 코드
- `enforcement/execute`는 FINALIZED action만 실행하며, due_process_state가 FINALIZED 아니면 RPC가 실행 거부
  - 근거: `execute_enforcement_action` 함수 본문(`...trust_sbt_pipeline.sql:509+`)
- E2E/빌드는 현재 실행 환경 네트워크 제약(DNS/외부 폰트 fetch)으로 완전 green 증명이 불가

## 7) KPI 상태 (현재 실행 근거 기반)

- low-trust 발급 성공률
  - 자동화 실측치 산정 불가 (remote E2E seed 네트워크 실패로 실행 불가)
  - 단, API/타입/린트 수준 구현 완료 및 테스트 시나리오 코드 반영 완료
- high-trust 승급 경로 E2E green
  - 현재 환경에서는 미달성 (DNS ENOTFOUND로 remote E2E 시작 단계 실패)
- 원장/감사로그 누락 0
  - 코드 레벨 보강 완료: 신규 도메인 테이블 audit trigger 연결 + collateral/enforcement는 token_ledger/RPC 경로 강제
  - 실데이터 런타임 검증은 네트워크 가능한 환경에서 추가 확인 필요

---

## 8) 추가 보완 (2026-02-28)

### 8-1. 감사/챌린지 시작 단계 원자성(트랜잭션) 보완
- 신규 마이그레이션 추가:
  - `supabase/migrations/20260228010000_audit_challenge_atomic_open.sql`
- 신규 RPC:
  - `public.open_random_audit_and_freeze(...)`
  - `public.open_challenge_audit_and_freeze(...)`
- 두 함수 모두 `SECURITY DEFINER + row_security=off`로 service_role 서버 경로 전용 실행.
- 핵심 보장:
  - claim lock(`FOR UPDATE`) 기반으로 `audit/challenge/freeze/enforcement` 단일 트랜잭션 처리
  - 중간 실패 시 partial write 방지
  - `AUDIT_ALREADY_OPEN` 가드로 중복 오픈 방지
- 권한:
  - PUBLIC execute revoke
  - service_role execute grant

### 8-2. API 라우트 전환 (RPC 기반)
- `apps/web/app/api/audit/random/open/route.ts`
  - 다중 직접 write 제거
  - `open_random_audit_and_freeze` RPC 호출로 전환
  - 에러코드별 status 매핑(`CLAIM_NOT_FOUND`, `AUDIT_ALREADY_OPEN` 등)
- `apps/web/app/api/challenge/open/route.ts`
  - 다중 직접 write 제거
  - `open_challenge_audit_and_freeze` RPC 호출로 전환
  - 에러코드별 status 매핑

### 8-3. Next.js 운영 보완
- `middleware.ts` → `proxy.ts` 전환
  - 파일: `apps/web/proxy.ts`
  - 빌드 경고(미들웨어 컨벤션 deprecate) 해소

### 8-4. 컨트랙트 테스트 안정화
- 파일: `apps/contracts/test/FraudRegistry.ts`
- hardhat chai matcher 의존(`revertedWith`, `emit`) 제거
- 수동 revert 검증 + receipt 로그 파싱 방식으로 이벤트 검증 전환

### 8-5. 검증 로그
- `pnpm --filter web exec eslint app/api/audit/random/open/route.ts app/api/challenge/open/route.ts proxy.ts` → 통과
- `pnpm --filter web exec tsc --noEmit` → 통과
- `pnpm --filter web build` → 통과
- `cd apps/contracts && npx hardhat test` → **5 passing**

## 9) 추가 보완 (2026-02-28, 2차)

### 9-1. 인터뷰 라우트 타입 안정화 (실패 원인 제거)
- `apps/web/app/api/interview/route.ts`
  - Gemini 응답 타입 가드(`isInterviewResult`) 추가
  - `parsedResult` null 가능성 제거
- `apps/web/app/api/interview/finalize/route.ts`
  - `SafeFinalizeNode` + `normalizeFinalizeNode` 도입
  - 선택 필드가 많은 `FinalizeNode`를 DB 저장 전 강제 정규화

### 9-2. 백엔드 API lint/type 부채 대량 정리
- `apps/web/app/api/admin/review/sweep/route.ts`
- `apps/web/app/api/admin/verify/decide/route.ts`
- `apps/web/app/api/admin/verify/purge-artifacts/route.ts`
- `apps/web/app/api/admin/zk/registry/toggle/route.ts`
- `apps/web/app/api/admin/zk/registry/upsert/route.ts`
- `apps/web/app/api/admin/zk/reset/route.ts`
- `apps/web/app/api/admin/zk/rollup/prepare/route.ts`
- `apps/web/app/api/admin/zk/snapshot/route.ts`
- `apps/web/app/api/contract/sign/route.ts`
- `apps/web/app/api/integrity/merkle-snapshot/route.ts`

핵심:
- `catch (e: any)` 제거 및 `unknown` + 안전 메시지 변환
- `Record<string, unknown>` 기반으로 `any` 제거
- merkle snapshot 파일은 타입 모델(`AuditLogRow`, `EventReceiptInsert`)을 도입해 증분 앵커링 로직은 유지하고 타입 안정성 강화

### 9-3. 프론트 데모/운영 페이지 보완
- `apps/web/app/debug/realtime/page.tsx`
  - Realtime payload 타입 가드 추가(`extractRealtimeRecord`)
  - `User`, `RealtimeChannel` 타입 적용
- `apps/web/app/osint/page.tsx`
  - 리포트 상태 타입화
- `apps/web/app/remote-test/page.tsx`
  - 응답 파싱 타입 추가, 에러 처리 타입화
- `apps/web/app/revoke/page.tsx`
  - API 응답 타입/에러 처리 타입화
- `apps/web/app/rls/page.tsx`
  - mock DB 응답 타입 적용
- `apps/web/app/admin/dashboard/page.tsx`
  - unescaped quote 및 evidence `any` 제거
- `apps/web/app/admin/users/[id]/page.tsx`
  - 불필요 import/query 제거, audit log 타입화
- `apps/web/app/page.tsx`, `apps/web/app/report/page.tsx`
  - JSX text-node/unescaped entity 오류 해소

### 9-4. legacy/generated JS lint 차단 최소화
- 생성물/legacy CJS 파일에 한정해 lint disable 주석 추가:
  - `apps/web/lib/gemini.js`
  - `apps/web/test-gemini.js`
  - `apps/web/create-bucket.js`
  - `apps/web/scripts/pg-mock-zk.js`
  - `apps/web/scripts/postgrest-mock.js`

### 9-5. 검증 결과
- `pnpm --filter web exec tsc --noEmit` → 통과
- `pnpm --filter web lint` → **0 errors, 27 warnings**
- `pnpm --filter web build` → 통과

정량 변화:
- lint: **54 errors → 17 errors → 0 errors**

## 10) 추가 보완 (2026-02-28, 3차: warning 0 달성)

### 10-1. 프론트 경고 제거
- `apps/web/app/consent/page.tsx`
  - 미사용 import(`CardContent`, `Label`, `useRouter`) 및 미사용 변수 제거
- `apps/web/app/contract/page.tsx`
  - 미사용 `router` 제거
- `apps/web/app/report/page.tsx`
  - 미사용 `CardFooter` import 제거
- `apps/web/app/page.tsx`
  - `<img>` -> `next/image`(`unoptimized`) 전환
- `apps/web/app/admin/users/[id]/page.tsx`
  - `<img>` -> `next/image`(`unoptimized`) 전환
- `apps/web/components/ui-kit.tsx`
  - `AuditLogRow`의 `hash`를 실제 렌더링에 사용하도록 정리

### 10-2. 스크립트/테스트 warning 정리 (미사용 변수 제거 중심)
- `apps/web/force_verify.mjs`
- `apps/web/lib/gemini.ts`
- `apps/web/scripts/ci-migrate-smoke-test.mjs`
- `apps/web/scripts/generate-admin-proofs.mjs`
- `apps/web/scripts/mock-schema3-etl.mjs`
- `apps/web/scripts/pg-evidence-driver.mjs`
- `apps/web/scripts/pg-extract.mjs`
- `apps/web/scripts/run-spec-lock.mjs`
- `apps/web/scripts/simulate-holds.mjs`
- `apps/web/scripts/simulate-idempotency.mjs`
- `apps/web/scripts/simulate-review-pipeline.mjs`
- `apps/web/scripts/test-phase4.5-raw.mjs`
- `apps/web/test-verified-summary.mjs`
- `apps/web/tests/e2e/auth.setup.ts`
- `apps/web/tests/e2e/onboarding-flow.spec.ts`

원칙:
- 실행 의미를 바꾸지 않고 미사용 import/변수만 제거
- 경고 억제를 위한 광범위 eslint off 대신, 가능한 한 코드 정리로 해소

### 10-3. 검증 결과
- `pnpm --filter web lint` → 통과 (warning 0)
- `pnpm --filter web exec tsc --noEmit` → 통과
- `pnpm --filter web build` → 통과

정량 변화:
- web lint: **0 errors, 27 warnings -> 0 errors, 0 warnings**

## 11) Remote E2E 실행 결과 (2026-02-28)

### 11-1. 실행 커맨드
- `pnpm --filter web test:e2e:remote`

### 11-2. 실행 결과 요약
- seed: 성공 (remote user/profile/verifications/consents/interview 생성)
- playwright: **2 failed / 3 passed / 1 did not run**
- cleanup: 성공 (seed user 삭제)

### 11-3. 실패 테스트
1) `onboarding-real.spec.ts:160` 
- 기대: KYC 완료 후 `/onboarding/qualification`
- 실제: `/onboarding/verify`에 잔류

2) `onboarding-real.spec.ts:322`
- 기대: `POST /api/sbt/self-claim` status 200
- 실제: status 500

### 11-4. 서버/DB 근본 원인 (코드/실행 근거)
- WebServer 로그에서 반복 확인:
  - `column profiles.is_frozen does not exist` (Postgres 42703)
- 원격 DB 스키마 직접 확인:
  - `profiles.is_frozen` select -> 42703
  - `public.sbt_claims` select -> PGRST205 (table not found)
  - `public.audits` select -> PGRST205 (table not found)

즉, remote(cjmn) DB가 Trust SBT 마이그레이션 이전 상태로 보임.

### 11-5. 기대 스키마 근거 파일
- `supabase/migrations/20260227000000_trust_sbt_pipeline.sql`
  - `profiles.is_frozen` 추가: line 59
  - `sbt_claims` 생성: line 85
  - `audits` 생성: line 107

결론:
- 현재 remote E2E 실패는 테스트 코드 자체보다 **remote DB migration drift**가 1차 원인.

## 12) Remote E2E 재검증 Green (2026-02-28)

### 12-1. 전제
- 사용자 확인대로 환경 분리:
  - `cjmn*` = 테스트 DB
  - `fcqs*` = 본 DB
- 이번 실행은 `apps/web/.env.test.local` 기준 `cjmn` 대상으로만 수행.

### 12-2. 실행 커맨드
- `pnpm --filter web test:e2e:remote`

### 12-3. 결과
- Playwright: **6 passed (35.2s)**
- seed: 성공
- cleanup: 성공

### 12-4. 의미
- 실패 원인이었던 remote schema drift(`profiles.is_frozen`, `sbt_claims`, `audits` 부재) 해소 후,
  onboarding + trust-sbt 승급 경로가 원격 통합 시나리오에서 정상 동작 확인.

## 13) fcqs(본DB) 반영 시도 결과 (2026-02-28)

### 13-1. 시도 내용
- 대상 고정: `https://fcqsdfpbwqjpvpunrxdh.supabase.co`
- SQL 실행 RPC 탐색:
  - `apply_patch`
  - `run_sql`
  - `pg_execute_sql`
  - `execute_sql`
  - `exec_sql`

### 13-2. 결과
- 전부 `PGRST202` (함수 없음)
- 즉, service_role REST 경로로는 raw DDL 실행 불가

### 13-3. 결론
- fcqs 반영은 현재 세션 기준 자동화 불가
- 필요: Supabase SQL Editor 수동 실행 또는 CLI access token/DB direct 자격

## 14) fcqs(본DB) 반영 검증 (2026-02-28)

### 14-1. 검증 대상
- project: `fcqsdfpbwqjpvpunrxdh`
- 검증 방식: service_role로 PostgREST select + RPC 호출

### 14-2. 결과
- `profiles.is_frozen / freeze_reason / freeze_updated_at` 컬럼: OK
- `feature_flags`: OK
- `sbt_claims`: OK
- `audits`: OK
- `challenges`: OK
- `collateral_accounts`: OK
- `enforcement_actions`: OK
- feature flag 기본값:
  - `COLLATERAL_REQUIRED_ON_SIGNUP=false`
  - `COLLATERAL_REQUIRED_FOR_HIGH_TRUST=false`
  - `ZK_ROUTES_ENABLED=false`
- RPC 존재 확인:
  - `open_random_audit_and_freeze`: OK (BAD_REQUEST 응답으로 함수 존재 확인)
  - `open_challenge_audit_and_freeze`: OK (BAD_REQUEST 응답으로 함수 존재 확인)

결론:
- fcqs 본DB에 Trust SBT + Atomic audit/challenge open 경로 반영 완료 및 런타임 접근 확인.

## 15) 인터뷰↔매칭 상호 고도화 2차 반영 (2026-03-01)

### 15-1. 변경 파일
- `apps/web/app/api/interview/next/route.ts`
- `apps/web/app/api/interview/finalize/route.ts`
- `apps/web/scripts/run-hybrid-match.mjs`

### 15-2. 핵심 변경 (코드 근거)
A) 인터뷰 next 질문 선택 로직 강화 (`interview/next/route.ts`)
- transcript 기반 메모리 계산 함수 추가:
  - `getRecentAssistantQuestions`
  - `resolveTopicCoverage`
  - `resolveInterviewTopic`
  - `buildDeterministicFallbackQuestion`
- `SELF_DEVELOPMENT_SIGNALS`에 더해 `INTERVIEW_MEMORY`(최근 질문, unresolved topic, fingerprint)를 프롬프트에 주입.
- 반복 질문 완화 지시 강화:
  - 최근 질문 패턴 반복 금지
  - 추상 선호 대신 구체 행동 사례 질문 우선
- LLM 출력 불안정 시 topic별 deterministic fallback 질문으로 안전하게 진행.

B) 인터뷰 finalize 결과를 “실행 가능한 self-development”로 구조화 (`interview/finalize/route.ts`)
- 신규 타입/생성 로직 추가:
  - `DevelopmentAction`, `MatchAdjustmentHints`
  - `buildDevelopmentActionPlan(...)`
  - `buildMatchAdjustmentHints(...)`
- `analysis_json.self_development` 확장:
  - 기존 `learning_delta` 유지
  - `action_plan` 추가 (우선순위/지표/목표/기간)
  - `match_adjustment_hints` 추가 (exploration bias, confidence override, prefer/avoid tags)
- adaptive risk flag와 결합하여 계획/힌트를 생성하므로 인터뷰 결과가 바로 다음 매칭 정책에 반영 가능.

C) 매칭 엔진 적응형 고도화 (`run-hybrid-match.mjs`)
- 버전: `hybrid-v3` -> `hybrid-v3.1`
- 후보 필터 강화:
  - `profiles.is_frozen === true` 유저 제외
- self-development 모델 확장:
  - `match_adjustment_hints` 파싱/머지/기본값 로직 추가
  - `getExplorationNeed(...)`로 사용자별 탐색 필요도 계산
- 점수식 확장:
  - prefer/avoid/focus 힌트 오버랩 기반 보너스/패널티 반영
  - hint 기반 confidence weight 반영
- 탐색 선택 강화:
  - exploration pool 정렬 시 adaptive exploration need + HIGH bias 반영
- 노출 제어:
  - `MATCH_MAX_NEW_PER_USER`(기본 3) 도입
  - `selectWithPerUserCap(...)`로 사용자별 신규 매칭 상한 강제
- 감사 로그 강화:
  - run audit에 `max_new_matches_per_user`, `per_user_selected_count`, `skippedByCap` 포함

### 15-3. 검증 결과
- `node --check apps/web/scripts/run-hybrid-match.mjs` -> 통과
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과

### 15-4. 메모
- 사용자 요청대로 이번 라운드는 고도화 중심으로 진행했고, E2E 원격 실행은 다음 단계로 보류.

### 15-5. SSOT/대시보드 self-development 가시화 추가 (2026-03-01)
- `apps/web/app/api/me/status/route.ts`
  - 최신 인터뷰 `analysis_json.self_development`에서 아래 메타 추출하여 응답에 포함:
    - `self_dev_confidence`
    - `self_dev_focus_topics`
    - `self_dev_action_plan` (상위 3개)
- `apps/web/lib/types/status.ts`
  - status meta 타입에 self-development 필드 추가
- `apps/web/app/(guarded)/dashboard/page.tsx`
  - Dashboard 카드에 Behavioral 신뢰도와 Self Development Loop 액션 카드 표시

재검증:
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `node --check apps/web/scripts/run-hybrid-match.mjs` -> 통과

## 16) Anti-Hallucination + Self-Improving 알고리즘 고도화 (2026-03-01)

### 16-1. 목표
- LLM/매칭엔진 모두에서 "모델 출력 직사용"을 줄이고,
  - 근거 검증(grounding) 실패 시 보수적 판단
  - deterministic 백업 사용
  - 최근 결과 기반 동적 보정(자기학습)
  을 코드 레벨로 강제.

### 16-2. 변경 파일
- `apps/web/app/api/interview/finalize/route.ts`
- `apps/web/app/api/interview/next/route.ts`
- `apps/web/scripts/run-hybrid-match.mjs`

### 16-3. LLM(interview finalize) 변경
A) 근거성 평가기 추가 (`assessGrounding`)
- transcript(user 발화) + verified profile를 corpus로 구성
- finalize 결과 claim(책/영화/운동/MBTI/vibe tag)을 추출
- claim별 지지 여부를 lexical grounding으로 점수화
- 산출:
  - `claim_count`, `supported_count`, `unsupported_count`, `coverage`, `unsupported_claims`

B) 자동 보수 게이트
- `coverage < 0.65` 또는 unsupported claim 다수 시 risk flag 추가:
  - `LOW_GROUNDING_COVERAGE`
  - `UNSUPPORTED_CLAIMS_DETECTED`
- 해당 조건에서 PASS면 자동 REVIEW로 강등
- `coverage < 0.5`면 score/absolute_score 상한 제한(55)

C) self-development 학습 상태 확장
- `analysis_json.self_development.grounding` 저장
- `learning_delta`에 `grounding_delta_from_previous_interview` 추가
- match 힌트 계산에 grounding coverage 반영:
  - grounding 낮으면 exploration_bias HIGH
  - confidence weight override 하향

### 16-4. LLM(interview next) 변경
- 프롬프트 제약 강화:
  - transcript에 없는 사실 단정 금지 문구 추가

### 16-5. 매칭엔진 변경 (`hybrid-v3.2`)
A) LLM 근거 allowlist 강제
- pair별로 `buildEvidenceAllowlist` 생성 (traits_json + verified_feature leaf path)
- 프롬프트에 `[ALLOWED_FIELD_PATHS]` 명시
- `validateEvidence`에서 allowlist 밖 field_path 즉시 drop

B) 값 일치 검증 + grounding score
- evidence.value vs 실제 값 매칭 점수(`value_match_score`) 계산
- 구조 유효성 + 값 일치로 `grounding_score` 산출
- confidence를 grounding_score로 추가 조정

C) deterministic 백업 + 블렌딩
- `deterministicDirectionalPrediction` 추가
- `blendDirectionalPrediction`으로
  - grounding/confidence 높을 때만 LLM 가중
  - grounding 낮으면 deterministic 비중 자동 확대
- fallback 건수 카운트: `llmDeterministicFallback`

D) 자기학습(동적 캘리브레이션)
- 최근 `pair_outcomes.interaction_score`로 런타임 보정값 계산:
  - `exploration_rate`
  - `confidence_scale`
  - `friction_penalty_scale`
- 최종 점수식/탐색 비율에 즉시 반영
- audit log에 calibration/threshold 기록

### 16-6. 검증
- `node --check apps/web/scripts/run-hybrid-match.mjs` -> 통과
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과

## 17) 테스트 + 전체 리뷰 기반 보완 패치 (2026-03-01)

### 17-1. 테스트 실행 결과
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> **6 passed**
- 보완 패치 후 재실행:
  - `pnpm --filter web lint` -> 통과
  - `pnpm --filter web build` -> 통과
  - `pnpm --filter web test:e2e:remote` -> **6 passed**

### 17-2. 점수 향상 목적 보완 패치
A) 프론트엔드 로그아웃 신뢰성
- 파일: `apps/web/app/(guarded)/dashboard/page.tsx`
- 변경:
  - Supabase browser client `auth.signOut()`로 실제 세션 종료
  - 중복 클릭 방지(`isSigningOut`) + 버튼 disabled 처리

B) 백엔드 감사 결정 경로 write 무결성
- 파일: `apps/web/app/api/audit/decide/route.ts`
- 변경:
  - `assertNoWriteError` 도입
  - audit/challenge/claim/profile/enforcement write 전 단계 에러 강제 체크
  - write 실패 시 즉시 예외로 500 처리 (부분 성공 오인 응답 방지)

C) 인터뷰 next transcript 저장 무결성
- 파일: `apps/web/app/api/interview/next/route.ts`
- 변경:
  - 사용자 답변/다음 질문 transcript update 결과 에러 체크
  - 저장 실패 시 500 반환

D) challenge/open 입력 검증 강화
- 파일: `apps/web/app/api/challenge/open/route.ts`
- 변경:
  - `subject_user_id`, `claim_id` UUID 형식 검증
  - `evidence_ref` 길이 상한(512)
  - `note` 길이 상한(2000)

### 17-3. 잔여 리스크(리뷰 결과)
- `api/audit/decide`는 다단계 write를 RPC 트랜잭션 1회 호출로 묶지 않아,
  DB/네트워크 장애 시 여전히 "부분 커밋" 가능성이 남음.
  (현재는 단계별 에러 검출로 오인응답은 줄였으나, 원자성은 미보장)

### 17-4. 추가 점수향상 패치 (2026-03-01, 2차)
- `apps/web/next.config.ts`
  - `allowedDevOrigins` 명시(127.0.0.1/localhost)로 Next dev cross-origin 경고/차단 리스크 완화
- `apps/web/lib/server/trust.ts`
  - `hasValidCronSecret`를 `timingSafeEqual` 기반 상수시간 비교로 변경 (secret 비교 하드닝)

재검증:
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> **6 passed**

## 18) P1/P2 보완 패치 (2026-03-02)

### 18-1. P1 원자성 보완: audit decide 경로
A) DB 원자 처리 함수 추가 (RPC 1회)
- 파일: `supabase/migrations/20260302000000_audit_decide_atomic.sql`
- 핵심:
  - `public.decide_audit_atomic(...)` 추가
  - audit/claim row lock(`FOR UPDATE`) 후 PASS/FAIL 분기 write를 단일 함수 트랜잭션 경계에서 처리
  - PASS: audit resolve + freeze action finalize/execute + claim HIGH ACTIVE + profile unfreeze + challenge resolve
  - FAIL: audit resolve fail + claim DISHONORED + profile freeze + slash/revoke enforcement upsert(FINALIZED)
  - 에러 코드를 JSON(`BAD_REQUEST`, `AUDIT_NOT_FOUND`, `AUDIT_ALREADY_DECIDED`, `COLLATERAL_REQUIRED_FOR_HIGH_TRUST` 등)로 반환

B) 라우트에서 RPC 우선 사용 + 호환 fallback
- 파일: `apps/web/app/api/audit/decide/route.ts`
- 핵심:
  - `POST /api/audit/decide`가 `admin.rpc('decide_audit_atomic', ...)`를 우선 호출
  - RPC 오류 도메인 코드를 HTTP status로 매핑
  - 원격 환경에 RPC가 아직 없는 경우(`PGRST202`/함수 미존재) `decideAuditLegacy(...)`로 자동 fallback
    - 목적: 마이그레이션 반영 전 환경에서도 API 500 대신 기존 경로로 동작 유지

### 18-2. P2 보완: 인터뷰/매칭 엔진 단위테스트 계층 추가
A) 인터뷰 finalize grounding 로직 모듈화
- 파일: `apps/web/lib/server/interview-grounding.js`
- 제공 함수:
  - `assessGrounding(...)`
  - `applyGroundingDecisionGuard(...)`
- 적용 파일:
  - `apps/web/app/api/interview/finalize/route.ts`
  - finalize 경로에서 모듈 함수 호출로 grounding 판단/guard 처리

B) 매칭 엔진 핵심 함수 export + import-safe 실행 가드
- 파일: `apps/web/scripts/run-hybrid-match.mjs`
- 변경:
  - 테스트 가능한 core 함수 export
    - `clamp`, `asNumber`, `normalizeTagList`, `intersectionSize`
    - `valueMatchScore`, `buildEvidenceAllowlist`
    - `deterministicDirectionalPrediction`, `blendDirectionalPrediction`
    - `computeOutcomeCalibration`, `runHybridMatch`
  - 직접 실행 시에만 job 실행되도록 엔트리 가드 적용
    - `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { runHybridMatch(); }`

C) 단위테스트 신설
- 파일: `apps/web/tests/unit/interview-grounding.test.mjs`
  - grounding coverage 산출 검증
  - weak grounding 시 PASS->REVIEW 강등 및 score cap 검증
- 파일: `apps/web/tests/unit/run-hybrid-match-core.test.mjs`
  - evidence allowlist
  - value match score
  - weak-grounding 블렌딩 시 deterministic 우세
  - outcome calibration
  - deterministic prediction bounds
- 스크립트:
  - `apps/web/package.json`에 `test:unit` 추가

### 18-3. 검증 로그
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web test:unit` -> 통과 (7 passed)
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> 통과 (6 passed)

### 18-4. 근거 파일(핵심 라인)
- `supabase/migrations/20260302000000_audit_decide_atomic.sql`
  - 함수 정의/락/상태전이: line 6~252
  - 결과 JSON 반환: line 253~293
- `apps/web/app/api/audit/decide/route.ts`
  - RPC 호출: line 306~313
  - RPC 미존재 fallback: line 315~325
  - 결과 매핑 응답: line 332~362
- `apps/web/lib/server/interview-grounding.js`
  - `assessGrounding`: line 120~144
  - `applyGroundingDecisionGuard`: line 146~171
- `apps/web/app/api/interview/finalize/route.ts`
  - grounding 적용: line 412~419
- `apps/web/scripts/run-hybrid-match.mjs`
  - core export 함수들: line 53,57,62,85,404,419,439,498,532,753
  - direct-run guard: line 1310~1312
- `apps/web/tests/unit/interview-grounding.test.mjs`
- `apps/web/tests/unit/run-hybrid-match-core.test.mjs`

## 19) 운영 DB(fcqs) decide_atomic 적용 여부 최종 점검 (2026-03-02)

### 19-1. 점검 결과
- 대상: `fcqsdfpbwqjpvpunrxdh` (운영)
- 방식: service_role로 `rpc('decide_audit_atomic', ...)` 직접 호출
- 결과: `PGRST202` (함수 미존재)
  - 메시지: `Could not find the function public.decide_audit_atomic(...) in the schema cache`

즉, 운영 DB에는 `20260302000000_audit_decide_atomic.sql`이 아직 반영되지 않았음.

### 19-2. 자동 적용 시도 결과
- `apply_patch`, `run_sql`, `pg_execute_sql`, `exec_sql`, `execute_sql` RPC 모두 `PGRST202` (미존재)
- 현재 Codex 실행환경에는 `SUPABASE_ACCESS_TOKEN` 미설정으로 `supabase projects list` 불가
  - 따라서 CLI 링크/원격 마이그레이션 자동반영 경로도 즉시 사용 불가

### 19-3. 결론
- 코드/마이그레이션은 준비 완료 상태이며,
- 운영 DB 반영만 남아 있음.
- 반영 완료 후 재검증(`decide_audit_atomic` 존재 확인 + `/api/audit/decide` pass 경로 smoke) 필요.

## 20) 운영 원자경로 강제 상태 확정 (2026-03-02)

### 20-1. DB 반영 재검증
- 운영(`fcqsdfpbwqjpvpunrxdh`) RPC 직접 호출 결과:
  - `decide_audit_atomic` 존재/호출 가능 확인
  - probe 결과: `{ ok: false, error: 'AUDIT_NOT_FOUND' }` (함수는 존재, 입력 audit_id만 더미)
- 테스트(`cjmnidnjbnfvqlzmekmc`) RPC 직접 호출 결과:
  - `PGRST202` (함수 미존재)

### 20-2. 코드 보완 (운영 강제 + 테스트 임시 fallback)
- 파일: `apps/web/app/api/audit/decide/route.ts`
- 변경:
  - `LEGACY_FALLBACK_ALLOWED_REFS` 도입 (기본값: `cjmnidnjbnfvqlzmekmc`)
  - 현재 프로젝트 ref 파싱(`NEXT_PUBLIC_SUPABASE_URL`) 후 fallback 허용 여부 판단
  - `decide_audit_atomic` 미존재 시:
    - 허용 ref(cjmn)에서만 `decideAuditLegacy` fallback
    - 비허용 ref(운영 포함)에서는 `ATOMIC_RPC_MISSING` 500 반환
- 효과:
  - 운영(fcqs)은 원자 RPC 경로가 없으면 실패하도록 강제되어, 순차 write로 내려가지 않음
  - 테스트(cjmn)는 기존 E2E 안정성을 위해 임시 fallback 유지

### 20-3. 재검증
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> 통과 (6 passed)

## 21) fallback 기본 제거 + E2E 한정 허용 (2026-03-02)

### 21-1. 배경
- `fcqs`에는 `decide_audit_atomic` 반영 완료
- `cjmn`은 여전히 함수 미존재(PGRST202)
- 이 환경에서 `cjmn`에 raw SQL을 자동 적용할 RPC/CLI 토큰 경로가 없어 즉시 DB 반영 불가
  - `apply_patch/run_sql/pg_execute_sql/exec_sql/execute_sql` 전부 미존재
  - `supabase db push`는 `SUPABASE_ACCESS_TOKEN` 부재로 실행 불가

### 21-2. 코드 변경 (원자 경로 기본 강제)
A) audit decide fallback 기본값 제거
- 파일: `apps/web/app/api/audit/decide/route.ts`
- 변경:
  - `AUDIT_DECIDE_LEGACY_FALLBACK_REFS` 기본값을 `''`로 변경
  - 즉, 환경변수 미설정 시 어떤 ref에서도 legacy fallback 비활성

B) E2E 스크립트에서만 cjmn fallback 명시 허용
- 파일: `apps/web/package.json`
- 변경:
  - `test:e2e:remote` 실행 커맨드에만
    - `AUDIT_DECIDE_LEGACY_FALLBACK_REFS=cjmnidnjbnfvqlzmekmc` 주입
- 효과:
  - 일반 실행/운영은 기본적으로 완전 원자 경로
  - 현재 cjmn remote E2E 안정성은 유지

### 21-3. 검증
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> 통과 (6 passed)

### 21-4. 남은 최종 정리 포인트
- `cjmn`에 `20260302000000_audit_decide_atomic.sql` 적용 후,
  `test:e2e:remote`의 환경변수 주입 제거 + route 내 legacy 경로 삭제 가능.

## 22) 전 환경 완전 원자 경로 전환 완료 (2026-03-02)

### 22-1. DB 상태 재확인
- `fcqs`: `decide_audit_atomic` 존재 확인 (`function_exists: true`)
- `cjmn`: `decide_audit_atomic` 존재 확인 (`function_exists: true`)
- 두 환경 모두 probe 호출 시 `AUDIT_NOT_FOUND` 반환(더미 audit_id 기준)으로 함수 실행 가능 확인

### 22-2. 코드 정리 (legacy fallback 완전 제거)
A) audit/decide route 단순화
- 파일: `apps/web/app/api/audit/decide/route.ts`
- 변경:
  - `decideAuditLegacy` 함수 삭제
  - `AUDIT_DECIDE_LEGACY_FALLBACK_REFS` 분기/환경 ref 파싱 삭제
  - 에러 시 동작:
    - `decide_audit_atomic` 미존재 -> `ATOMIC_RPC_MISSING` 500
    - 기타 RPC 에러 -> `AUDIT_DECIDE_FAILED` 500
- 결과: `/api/audit/decide`는 DB RPC 1회 원자 경로만 사용

B) E2E 스크립트 fallback 주입 제거
- 파일: `apps/web/package.json`
- 변경:
  - `test:e2e:remote`에서 `AUDIT_DECIDE_LEGACY_FALLBACK_REFS=...` 주입 삭제

### 22-3. 최종 검증
- `pnpm --filter web lint` -> 통과
- `pnpm --filter web build` -> 통과
- `pnpm --filter web test:e2e:remote` -> 통과 (6 passed)

결론: 현재 코드/DB 모두에서 audit decide 경로는 완전 원자 RPC 경로로 고정됨.
- 추가 확인: `pnpm --filter web test:unit` -> 통과 (7 passed)

## 23) Tokenomics 점수상승 하드닝 패치 (2026-03-05)

### 23-1. 신규 마이그레이션 추가
- 파일: `supabase/migrations/20260305000000_tokenomics_hardening.sql`
- 포함 내용:
  - `treasury_spend_with_budget(...)` RPC 추가
    - `treasury_budgets`를 `FOR UPDATE`로 잠그고 outflow cap 초과 시 거절
    - 지출 성공 시 `token_ledger`에 `TREASURY_SPEND` append-only 기록 + `outflow_used` 동시 갱신
  - `claim_soul_airdrop(...)` RPC 추가
    - 유저 1회 claim 경로를 DB 트랜잭션 단위로 처리
    - claim_no 기반 tier 산정 (TOP100/TOP1000/BASE) + `token_ledger` AIRDROP 기록
  - 비-UUID PK 테이블 감사로그 복구
    - `uuid_from_text(...)` + `log_audit_event_flexible(...)` 도입
    - `treasury_wallet`, `user_wallets`, `soul_airdrop_claims`, `treasury_vaults`, `economy_config` 감사 트리거 연결

### 23-2. 신규 API 엔드포인트 추가
- 파일: `apps/web/app/api/airdrop/claim/route.ts`
  - cookie session 유저가 RPC `claim_soul_airdrop` 호출
  - 응답: `status, claim_no, cohort, amount, ledger_id`
- 파일: `apps/web/app/api/treasury/spend/route.ts`
  - admin 또는 cron 전용
  - RPC `treasury_spend_with_budget` 호출
  - budget 상태(`BUDGET_NOT_FOUND`, `BUDGET_EXCEEDED`)를 HTTP 409로 매핑

### 23-3. 공통 로직 + 유닛테스트 보강
- 파일: `apps/web/lib/server/tokenomics-core.js`
  - `resolveAirdropTier(claimNo)`
  - `mapTreasurySpendStatusToHttp(status)`
- 파일: `apps/web/tests/unit/tokenomics-core.test.mjs`
  - airdrop tier 경계값 테스트
  - treasury spend status 매핑 테스트

### 23-4. 문서/인벤토리 반영
- 파일: `docs/endpoint_inventory.csv`
  - `/api/airdrop/claim`
  - `/api/treasury/spend`

## 24) Vercel Auth Loop 배포 차단 이슈 정리 (2026-03-05)

### 24-1. 관찰
- `apps/web/middleware.ts`와 `apps/web/proxy.ts`가 동시에 존재하던 상태에서
  Next 16 빌드가 아래 오류로 중단됨:
  - `Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected`
- 결과적으로 새 인증 수정이 배포되지 않아, 실서버에서 로그인 루프가 계속될 수 있는 상태였음.

### 24-2. 조치
- `apps/web/middleware.ts` 삭제
- `apps/web/proxy.ts` 단일 엔트리로 `updateSession`을 유지

### 24-3. 검증
- `pnpm --filter web build` 재실행 -> 통과
- 빌드 출력에 `ƒ Proxy (Middleware)` 표시되어 proxy 기반 세션 미들웨어가 활성화됨을 확인
