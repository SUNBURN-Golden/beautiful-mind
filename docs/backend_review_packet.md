# Backend MVP Review Packet

## 0. TL;DR
- **개요**: Supabase (PostgreSQL + PostgREST + Auth) 기반으로 본인확인, 동의, 전자서명, AI 인터뷰를 거쳐 대시보드에 도달하는 E2E 온보딩 백엔드 파이프라인.
- **강점**: 
  1) `event_receipts` 테이블을 불변의 SSOT(Single Source of Truth)로 삼고 ZK 레이어(`zk_*`)를 완벽히 비동기/`service_role` 격리(`scripts/zk-mirror-once.mjs`, `api/admin/zk/snapshot/route.ts`).
  2) `/api/me/status` 단일 API로 프론트엔드 상태 전이를 완전 제어하여 클라이언트 변조 방지.
- **핵심 리스크(P0)**: 
  1) `profiles` 테이블 생성을 위한 Auth Trigger 부재 시 회원가입 직후 RLS 삽입 제약으로 인하여 간헐적 프로필 누락 발생 가능성 존재. (아래 13번 항목 트리거로 보강 필요)
  2) 외부 콜백(PortOne 등) 장애 시 Idempotency Key(`source_receipt_id`) 충돌 가능성.

## 1. 아키텍처 개요
```text
[ Client (Browser/App) ]
       │
       ▼ (JWT / Session)
[ Next.js API Routes (/api/*) ] ──▶ [ PortOne (KYC) / External AI ]
       │ (service_role or JWT)
       ▼
[ Supabase PostgreSQL ]
  ├─ Data Tables: profiles ─▶ identity_claims ─▶ verifications ─▶ consents ─▶ contracts ─▶ interviews
  ├─ SSOT Log: event_receipts (Append Only, Immutable)
  └─ Audit: audit_logs (Trigger or service_role inserted)
       │
       ▼ (Async ETL or Admin snapshot trigger)
[ ZK Parallel Layer (zk_event_receipts, zk_rollup_batches) ] <- Strict service_role ONLY
```

## 2. 단일진실 API: `/api/me/status`
- **구현 위치**: `apps/web/app/api/me/status/route.ts`
- **목적**: 클라이언트가 개별 테이블을 폴링하지 못하도록 DB 상태를 집계하여 다음 Step을 강제.
- **Stage Enum (고정)**: `LOGIN` -> `KYC` -> `QUALIFICATION` -> `CONSENT_HUB` -> `E_SIGN` -> `AI_INTERVIEW` -> `DASHBOARD_READY`
- **상태 전이 규칙 (서버 DB 기준)**:
  - `KYC`: `profiles.verified = true` OR `identity_claims` 테이블 데이터 존재
  - `QUALIFICATION`: `verifications` 테이블 내 `type IN ('RESIDENCE', 'PHYSICAL', 'CAREER'/'EDUCATION')` 모두 `status = 'VERIFIED'`
  - `CONSENT_HUB`: `consents` 테이블에 필수 약관(`is_granted = true`) 존재
  - `E_SIGN`: `contracts` 테이블에 서명 완료 레코드 존재
  - `AI_INTERVIEW`: `interviews` 테이블에 `decision` 값 존재

## 3. 인증/인가 흐름
- **Supabase Auth JWT**: 모든 보호된 API는 `req.headers.get('Authorization')`의 JWT 식별을 통해 `auth.getUser()`로 검증.
- **Admin 라우트**: `/api/admin/*` 라우트는 토큰 검증 후 `profiles.is_admin = true` 여부를 추가 확인 (`apps/web/app/api/admin/zk/*/route.ts`).

## 4. 본인확인(통신사) 연동
- **위치**: `/api/verify/submit`, `/api/verify/complete`
- **특징**: PortOne(또는 동급 연동사) 응답과 CI/DI를 수신하여 `identity_claims`에 적재. 콜백 실패 시 재시도 가능토록 설계됨.

## 5. Consent Hub
- **모델링**: `consents` 테이블(`module`, `is_granted`, `user_id`).
- **감사로그**: 철회 및 동의 시 `audit_logs` 트리거 혹은 서버사이드 명시적 Insert (`action='INSERT'|'UPDATE'`).

## 6. 전자서명
- **위치**: `contracts` 테이블.
- **설계**: `contract_hash`, `signature`, `document_version` 컬럼을 통해 문서 무결성 보장. 반려 시 새로운 row 추가 혹은 version bump.

## 7. AI 인터뷰
- **위치**: `interviews` 테이블, `/api/interview/*` 라우트.
- **설계**: 평가 결과는 `decision`과 추출된 메타데이터 JSONB로 저장되며 `event_receipts`를 통해 불변 증적으로 1차 기록됨.

## 8. 대시보드
- **위치**: `/api/me/status` 완료 후 `profiles`, `verifications` 조인 뷰(`verified_summary_view.sql`) 활용. RLS `auth.uid() = user_id`로 자동 격리.

## 9. 신뢰성
- **멱등성**: `event_receipts` -> `zk_event_receipts` 복제 시 `ON CONFLICT (source_receipt_id) DO UPDATE` 패턴 활용 (`scripts/zk-mirror-once.mjs`).
- **에러 규격**: 고정 세분화 에러 코드 (`AUTH_REQUIRED`, `QUALIFICATION_REQUIRED`, `CONSENT_REQUIRED`, `BANNED`).
- **source_receipt_id 규칙**: `event_receipts` 본원장의 `id` (UUID). `zk_event_receipts.source_receipt_id` 컬럼에 매핑되며 유니크 컨스트레인트로 중복 생성 방지 보장 (위치: `20260225000016_zk_ssot_parallel.sql`).

## 10. 보안/RLS 리뷰 요약 (P0)
- **`zk_*` 테이블 전역**: `20260225000018_zk_spec_lock_v0.sql`을 통해 `anon`, `authenticated` 권한을 모두 박탈하고 오직 `service_role`에게만 `GRANT ALL` 허용됨 (안전).
- **`event_receipts` & `audit_logs`**: 클라이언트 UPDATE/DELETE 차단. 삽입만 허용 (`Trigger` 또는 `service_role`).
- **`verifications`, `identity_claims`**: `FOR SELECT USING (auth.uid() = user_id)`. 클라이언트 개변조 불가를 위해 `INSERT WITH CHECK (false)`.

## 11. Migration 체인 검증
- **순서**: `00_init_schema.sql` -> `05_master_init.sql` -> ... -> `16_zk_ssot_parallel.sql` -> `18_zk_spec_lock_v0.sql`.
- **단점**: 간혹 로컬 빈 DB 환경에서 Docker Daemon 종속성 없이 `npx supabase db reset` 시 PostgREST Schema Cache가 깨지는 이슈가 존재하며, 이를 극복하기 위해 `NOTIFY pgrst, 'reload schema'` 혹은 강제 재기동 워크플로우 요구.

## 12. 개선 제안 및 제약사항 플래그
- **[P0] /api/admin/* 환경 변수 하드블록**: 운영 환경 파괴 방지를 위해 모든 `/api/admin/zk/reset` 등 파괴적 관리 라우트는 `if (process.env.NODE_ENV === 'production') return 403;` 코드로 하드블록 처리가 되어 있으며, `x-dev-secret`을 교차 검증합니다.
- **[P1] Mock 데이터 엔드포인트 격리**: 테스트용 `/api/mock-db`와 Mock OSINT는 `NODE_ENV === 'production'` 일 시 접근을 완전히 차단하는 Dev Guard를 배포 완료했습니다.

## 13. [필수 추가] Profiles 트리거 방어 코드 스니펫
Supabase 회원가입 시 RLS/API 지연에 상관없이 `profiles`를 DB 레벨에서 확보하기 위한 권장 스니펫입니다. 
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, verified, banned, is_admin)
  VALUES (new.id, new.email, false, false, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```
