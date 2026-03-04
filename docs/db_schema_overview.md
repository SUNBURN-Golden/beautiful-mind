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
