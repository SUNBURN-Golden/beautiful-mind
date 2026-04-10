# order_from_god.md

### TL;DR 10줄 (핵심 요약)
1. **MVP 목적**: 신뢰 기반의 명시적 동의/검증 보안 플랫폼 (SoulBound).
2. **리브랜딩**: Beautiful Mind -> SoulBound (모든 코드/UI 반영 필수).
3. **절대 금지**: 법무 문구(`docs/legal/`) 수정 금지, `INSERT/UPDATE/DELETE` 클라이언트 직접 수행 금지 (RLS 100% 강제).
4. **단일 진실 (SSOT)**: 모든 상태 전이 로직은 `packages/core`가 소유하며, 프론트는 `router.push`가 아닌 server stage 기반 리다이렉트만 수행.
5. **보안**: PII 정보는 Merkle Snapshot 시점에 Keccak-256 해시로 대체 및 영구 삭제.
6. **실행 커맨드**: `pnpm install`, `pnpm dev`, `pnpm test:e2e:remote`.
7. **감사로그**: 모든 중요 액션(서명/동의/철회/AI인터뷰 등)은 `audit_logs`에 무조건 기록.
8. **데이터 구조**: `identity_claims`는 Insert-only, Immutable. 삭제/수정 시 트리거 에러 발생.
9. **관리자 레버**: 패널티는 자동 집행 금지. 신고 -> 임시 제한 -> 관리자 결정 -> 조치로만.
10. **언어**: 모든 UI와 문서는 한국어 우선.

---

## Found Evidence (근거 목록)
- **[.antigravityrules](.antigravityrules)**: 언어 원칙, 우선순위, 법무 텍스트 수정 금지, 동의 원칙, 패널티 프로세스, 코어 로직 고립.
- **[README.md](README.md)**: 모노레포 구조, 기술 스택, `/docs/legal/` 읽기 전용 명시.
- **[rls_policy_matrix.md](docs/rls_policy_matrix.md)**: 테이블별 RLS 정책 명세 및 클라이언트 쓰기 차단 원칙.
- **[phase6_done_checklist.md](docs/phase6_done_checklist.md)**: `router.push` 금지, SSOT 라우트 가드, 용어 정제 규칙.
- **[admission_gate.sql](supabase/migrations/20260225000010_admission_gate.sql)**: `identity_claims` 불변 트리거, 6-Pillar 검증 유형 정의.
- **[zk_spec_lock_v0.sql](supabase/migrations/20260225000018_zk_spec_lock_v0.sql)**: ZK 스펙 고정, `event_receipts` 트리거 설치 금지.

---

## A. Non-Negotiables (절대 불변 제약)
- **Legal Read-Only**: `docs/legal/*.md` 파일은 시스템의 법적 근거로, 에이전트나 코드로 수정할 수 없음. ([README.md:L14](README.md#L14), [.antigravityrules:L3](.antigravityrules#L3))
- **Immutable Identity**: `identity_claims` 테이블에 대한 `UPDATE`, `DELETE`는 DB 트리거 레벨에서 차단됨. ([20260225000010_admission_gate.sql:L20](supabase/migrations/20260225000010_admission_gate.sql#L20))
- **SSOT Logic**: 상태 판별 및 전이 로직은 오직 `packages/core` 패키지 내부에만 존재해야 함. 프론트엔드에서의 중복 구현 절대 금지. ([.antigravityrules:L9](.antigravityrules#L9))
- **RLS Mandatory**: 모든 테이블은 RLS가 활성화되어야 하며, `anon/authenticated` 롤은 `INSERT/UPDATE/DELETE` 권한을 가질 수 없음. ([docs/rls_policy_matrix.md:L14](docs/rls_policy_matrix.md#L14))

## B. MVP End-to-End Flow (상태 전이/화면)
- **Flow**: 가입(Auth) → 계약서 서명(Canvas) → 명시적 동의(Consent) → 본인 인증(PortOne) → AI 인터뷰(Gemini) → 매칭 → 만남 인증 → 리뷰/피드백 → (신고 시) 관리자 제재.
- **Redirection Rule**: 프론트엔드는 `router.push('/target')`을 직접 호출하지 않고, `GET /api/me/status`에서 반환된 `stage` 값에 따라 `layout.tsx`에서 중앙 집중식으로 리다이렉트를 처리함. ([docs/phase6_done_checklist.md:L11](docs/phase6_done_checklist.md#L11))

## C. Data & Security Rules
- **PII Scrubbing**: 사용자 원문(Raw Text)이나 민감 정보는 Merkle Anchor 생성 시 `payload_hash`로 대체하고 스토리지를 즉시 비움(Purge).
- **6-Pillars**: 검증은 `PHYSICAL`, `RESIDENCE`, `CAREER`, `EDUCATION`, `INCOME`, `ASSET` 중 6가지 필수 항목을 기준으로 수행됨. ([admission_gate.sql:L46](supabase/migrations/20260225000010_admission_gate.sql#L46))
- **Audit Logging**: 서명, 동의, 철회, AI 결과, 관리자 조치는 반드시 `audit_logs`에 `log_audit_event()` 트리거를 통해 기록. ([.antigravityrules:L8](.antigravityrules#L8))

## D. API Contracts
- **Endpoint Integrity**: 프론트엔드가 신뢰하는 유일한 상태 엔드포인트는 `GET /api/me/status`.
- **Zod Validation**: 모든 API 입출력은 Zod 스키마를 통해 검증하며, 특히 AI 응답은 정해진 JSON 포맷을 강제함.

## E. Operational Levers (Admin/Dev)
- **Admin Roles**: `is_admin = true`인 계정만이 `audit_logs` 전체 열람 및 제재 확정 가능.
- **Penalty Logic**: 시스템에 의한 즉각 정지는 금지. 신고 시 "PENDING" 상태로 전환 후 관리자가 최종 BAN 여부를 결정. ([.antigravityrules:L6](.antigravityrules#L6))
- **Dev-Login**: 로컬 테스트 가속화를 위해 실제 Auth를 우회하는 `/api/dev-login` 제공.

## F. Coding Workflow
- **Monorepo Strategy**: `pnpm` 워크스페이스 사용. 공통 로직은 `packages/core`에, 웹은 `apps/web`에 위치.
- **Internal Imports**: `@/` alias를 사용하여 임포트 경로 표준화.
- **Commit Pattern**: `feat()`, `fix()`, `refactor()` 접두사 사용 준수.

## G. Runbook
1. `pnpm install`: 의존성 설치.
2. `supabase start` (또는 원격 연결): DB 준비.
3. `pnpm dev`: 개발 서버 실행 (localhost:3000).
4. `pnpm test:e2e:remote`: 원격 DB 대상 E2E 테스트 수행. ([apps/web/package.json:L10](apps/web/package.json#L10))

## H. UNCONFIRMED / QUESTIONS
- **Blocker**: `api/consent/submit` 및 `api/contract/sign` 백엔드 엔드포인트의 물리적 구현 여부 확인 필요. ([docs/phase6_done_checklist.md:L5](docs/phase6_done_checklist.md#L5))
- **Scaling**: ZK Rollup의 실제 L1 전송 주기(Lazy Commitment)에 대한 상세 Threshold 수치 확인 필요.

---

## I. External Connections & Credentials
*보안 원칙에 따라 모든 비밀값은 [REDACTED] 처리됨. 실제 값은 `.env.local` 참조.*

### 1. Supabase (DB & Auth)
- **URL**: [REDACTED] (https://fcqsdfpbwqjpvpunrxdh.supabase.co)
- **Anon Key**: [REDACTED]
- **Service Role Key**: [REDACTED] (Server-side ONLY)

### 2. AI & Verification SDK
- **Gemini API Key**: [REDACTED] (AI 인터뷰/평가용)
- **PortOne Store ID**: [REDACTED]
- **PortOne Channel Key**: [REDACTED]
- **PortOne API Secret**: [REDACTED]

### 3. Development & Safety
- **DEV_BACKDOOR_SECRET**: [REDACTED] (관리자 인증 우회용)
- **CRON_SECRET**: [REDACTED] (배치 작업 인증)

---
**Last Updated**: 2026-02-27
**Authority**: SoulBound Core Ruleset
