# DB Schema Overview

## 1. 핵심 테이블
- `profiles`: 유저 기본 정보 (PK: `id`->`auth.users.id`, `verified`, `banned`, `is_admin`)
- `identity_claims`: CI/DI 및 통신사 실명 인증 결과 보관
- `verifications`: QUALIFICATION 검증용 다중 타입 데이터 보관 (`type` ENUM, `status` ENUM)
- `consents`: 약관 동의 허브 (`module`, `is_granted`)
- `contracts`: 전자서명 트레일 보관
- `interviews`: AI 인터뷰 최종 결정사항 보관
- `event_receipts`: 시스템 E2E 불변 SSOT 원장 (PK: `id`, `event_type`, `canonical_json`)

## 2. Stage/Status 제어
프론트엔드의 화면 전이는 개별 상태 플래그 컬럼 하나에 의존하지 않습니다. 
대신 각 핵심 테이블(`verifications`, `consents` 등)에 존재하는 **물리적 Record의 유무 및 Enum 값(`status = 'VERIFIED'`)**의 논리합으로 `/api/me/status`에서 결정됩니다.

## 3. ZK 고유 식별자 강제 (Idempotency)
- `source_receipt_id`: Node ETL 혹은 스냅샷 실행 시 `zk_event_receipts` 테이블에 반영되는 고유 참조키.
- **제약 조건**: `UNIQUE (source_receipt_id)`를 통해 `ON CONFLICT DO UPDATE` 처리되어 재생산 및 이중 Upsert에 완벽한 멱등성 보장. (`20260225000016_zk_ssot_parallel.sql` 테이블 정의 시 삽입됨)

## 4. Audit Log 표준
- `audit_logs` 테이블: 
  - `id`, `created_at`
  - `table_name` (텍스트)
  - `record_id` (대상 Row ID)
  - `action` ('INSERT', 'UPDATE', 'DELETE')
  - `old_data`, `new_data` (JSONB)
  - `changed_by` (행위자 UID)

## 5. 마이그레이션 적용 트리 (최신 진행부)
- `20260224050000_master_init.sql`: 메인 엔티티(profiles, verifications 등) 및 RLS 정책 1차 수립
- `20260225000000_private_ledger.sql`: event_receipts 불변 원장 설정
- `20260225000015_zk_rollup_slots.sql`: ZK 기초 롤업 테이블 정의 (`zk_rollup_batches` 등)
- `20260225000016_zk_ssot_parallel.sql`: `zk_event_receipts` 생성 및 `source_receipt_id` 유니크 컨스트레인트
- `20260225000018_zk_spec_lock_v0.sql`: ZK 테이블 RLS를 완벽히 `service_role`로 Lock-in

---

## ⚠️ Pending sync (2026-04-10 기준)
이 문서의 1~4번 섹션은 `20260225` 마이그레이션 기준으로 작성되어 있고, 그 이후 투입된 다음 마이그레이션들의 스키마 변경이 아직 본문에 반영되지 않았다. 전체 리라이트는 다음 리뷰어가 수행할 것. 아래는 머신 추출한 델타 목록이다.

### `20260226000000_patch_identity_claims_cleanup.sql`
- `public.block_identity_claims_mutation()` 트리거 함수 재정의: service_role 에서 E2E cleanup 삭제를 허용.

### `20260227000000_trust_sbt_pipeline.sql` (Trust SBT / Audit / Challenge / Enforcement)
- `profiles` 컬럼 추가: `is_frozen BOOLEAN`, `freeze_reason TEXT`, `freeze_updated_at TIMESTAMPTZ`.
- 신규 테이블: `feature_flags`, `sbt_claims`, `audits`, `challenges`, `collateral_accounts`, `enforcement_actions`.
- 신규 함수: `enforce_sbt_claim_rules`, `apply_collateral_deposit`, `apply_collateral_refund`.

### `20260228010000_audit_challenge_atomic_open.sql`
- 신규 함수: `open_random_audit_and_freeze`, `open_challenge_audit_and_freeze` — RANDOM/CHALLENGE audit open과 freeze 동시 처리 원자화.

### `20260302000000_audit_decide_atomic.sql`
- 신규 함수: `decide_audit_atomic` — `/api/audit/decide` 멀티테이블 쓰기 원자화.

### `20260305000000_tokenomics_hardening.sql`
- `soul_airdrop_claims` 컬럼 확장: `cohort`, `amount`, `airdrop_amount`, `claimed_at`, `verified_at` (NOT NULL + DEFAULT).
- 신규 함수: `uuid_from_text`, `log_audit_event_flexible`, `treasury_spend_with_budget`, `claim_soul_airdrop`.

### `20260306010000_admission_refactor.sql` (Admission refactor)
- 신규 테이블: `admission_applications`, `admission_document_submissions`, `consent_events`, `verified_claims`, `review_cases`, `review_case_events`, `soul_credentials`, `trust_ledger_events`.
- 트러스트 원장 트리거 묶음: `set_trust_ledger_event_hash`, `block_trust_ledger_mutation`, `log_trust_ledger_event`.
- 이 시점부터 admission 승인 경로가 legacy onboarding 테이블이 아닌 `admission_applications` → `admission_document_submissions` → `review_cases` → `soul_credentials` 라인으로 이동한다.

### `20260307100000_ai_operated_trust_os.sql` (AI-Operated Trust OS)
- 신규 테이블: `admission_decision_runs`, `policy_rules`, `appeals`, `exception_cases`, `audit_samples`, `admission_ops_metrics_daily`, `admission_ops_anomalies`, `policy_change_proposals`, `policy_shadow_runs`.
- 핫 패스에서 human review 제거 — human은 appeal / exception / audit 경로에만 개입.

### `20260309130000_soul_write_hardening.sql` (SOUL write-path hardening)
- 신규 함수: `append_soul_ledger_internal` (유일한 ledger append 경로), `guard_user_wallets_projection_write` (projection-only 강제), `sync_user_wallet_on_ledger_insert`, `reconcile_user_wallet_balance`.
- 지침: service_role 조차도 ledger에 직접 insert 금지. `append_soul_ledger_internal` RPC 를 통해서만 기록할 것.

### 추가 정합성 메모
- 1번 핵심 테이블 목록에는 `contracts`(전자서명 트레일) 만 등재되어 있으나, 프론트엔드 admission gating 이 이 테이블을 *substrate* 로 사용하도록 2026-03/04 에 전환됨 (최근 커밋 `09b5a2c`, `d7507e5`, `30bd2a3`, `abe76b5`, `a89be30`). `/api/me/status` 의 derivation 규칙 재검증 필요.
- `docs/audit_event_catalog.csv` 와 `docs/endpoint_inventory.csv` 도 위 테이블/함수 추가분에 맞춰 재생성 필요.
