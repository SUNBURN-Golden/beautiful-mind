# Wireflow & Recovery Handling (Admission-First)

## 1. Happy Path (Current)
1. `/login` 성공 -> middleware가 `/apply/status`로 이동
2. `/apply` -> `POST /api/admission/start` -> `IDENTITY`
3. `/apply/identity` -> `POST /api/verify/complete` -> `LIVENESS`
4. `/apply/liveness` -> `POST /api/admission/liveness/verify` -> `CONSENTS`
5. `/apply/consents` -> `POST /api/consent/submit` -> `DOCUMENTS`
6. `/apply/documents` ->
   - `POST /api/admission/document/upload`
   - `POST /api/admission/document/submit`
   -> `AI_DECISION`
7. `/apply/review` -> `POST /api/admission/review/submit` ->
   - `APPROVED` / `SOUL_ISSUED` / `ACTIVE` 또는
   - `RESUBMIT_REQUIRED` / `REJECTED` / `EXCEPTION_REVIEW`
8. `/apply/status`에서 결과 확인
9. 승인 + SOUL 발급 완료 시 `ACTIVE` -> `/dashboard`

## 2. Recovery Paths

### 2.1 Back/Refresh/Deep-Link Resume
- 브라우저 뒤로가기/새로고침/직접 URL 진입은 허용되지만 canonical stage가 아니면 즉시 교정됩니다.
- 교정 순서:
  1) middleware coarse gate
  2) client guard fine gate (`/api/me/status` 기반)

### 2.2 Unauthorized / Session Expired
- 보호 경로에서 세션 없음 -> `/login`
- 로그인 성공 후 항상 `/apply/status`를 거쳐 현재 stage로 정렬

### 2.3 Active-Only Route Access Before Approval
- `/dashboard`, `/match`, `/chat`, `/review`, `/report`, `/revoke` 접근 시 ACTIVE 미충족이면 `/apply/status`로 회수

### 2.4 Freeze / Ban
- `meta.is_frozen=true` -> `/banned`
- `profiles.banned=true` -> 강제 로그아웃 + `/login?error=ACCOUNT_BANNED`

### 2.5 Resubmit / Reject / Exception / Appeal
- 재제출: `/apply/documents`로 복귀
- 거절: `/apply/status`에서 사유 확인 후 `/apply/appeal`
- 예외/항소/감사: `/apply/status`에서 큐 상태 추적

## 3. Legacy Entry Handling
다음 경로는 핵심 흐름이 아니며 호환성 redirect만 수행합니다.
- `/onboarding/*`
- `/interview`
- `/contract`
- `/consent`
- `/osint`
- `/admin-verify`

## 4. UX Continuity Rules
- dead-end 금지: 오류 화면에는 항상 `재시도` + `현재 단계 이동` 제공
- 용어 일관성: onboarding 대신 admission, review 대신 AI 결정/콜드패스
- 상태 표시는 SSOT 기준 필드(`stage`, `blockers`, `meta`)만 사용

## 5. ACTIVE Surface Contract Boundary
- `/dashboard`는 ACTIVE 상태 요약의 canonical entry다.
- `/match`, `/chat`, `/review`, `/report`, `/revoke`는 ACTIVE 전용이며 page-level에서도 `status.step === ACTIVE`를 재확인한다.
- 하위 도메인 API가 아직 완성되지 않은 영역은 `active-contract` adapter를 통해 mock/API 경계를 명시한다.
