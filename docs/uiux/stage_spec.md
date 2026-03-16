# Stage Specification (SSOT)

## 1. Authoritative Stage Model
서버 `GET /api/me/status`가 유일한 상태 진실(SSOT)이며, 클라이언트는 이 응답만 소비합니다.

### Active Stage Vocabulary
- `LOGIN`: 인증 없음
- `APPLY_START`: admission 신청 미시작
- `IDENTITY`: 신원 검증 필요
- `LIVENESS`: 실재 인물 검증 필요
- `CONSENTS`: 분리 동의/확인문구 필요
- `DOCUMENTS`: 공식 문서 4종 제출/검증 필요
- `AI_DECISION`: AI 자동결정 실행/대기
- `RESUBMIT_REQUIRED`: 재제출 필요
- `REJECTED`: 거절 확정
- `EXCEPTION_REVIEW`: 예외 검토 큐
- `APPEAL_PENDING`: 항소 처리 큐
- `AUDIT_REVIEW`: 감사 검토 큐
- `APPROVED`: 승인되었으나 SOUL 발급 대기
- `SOUL_ISSUED`: SOUL 발급 완료, 활성화 대기
- `ACTIVE`: 핵심 기능 접근 가능

### Legacy Compatibility Aliases
- `AI_REVIEW` -> `AI_DECISION`
- `HUMAN_REVIEW` -> `EXCEPTION_REVIEW`

## 2. Stage -> Route Mapping
`apps/web/lib/stageRoutes.ts` 기준 canonical mapping.

| Stage | Route |
|---|---|
| `LOGIN` | `/login` |
| `APPLY_START` | `/apply` |
| `IDENTITY` | `/apply/identity` |
| `LIVENESS` | `/apply/liveness` |
| `CONSENTS` | `/apply/consents` |
| `DOCUMENTS` | `/apply/documents` |
| `AI_DECISION` | `/apply/review` |
| `RESUBMIT_REQUIRED` | `/apply/documents` |
| `REJECTED` | `/apply/status` |
| `EXCEPTION_REVIEW` | `/apply/status` |
| `APPEAL_PENDING` | `/apply/status` |
| `AUDIT_REVIEW` | `/apply/status` |
| `APPROVED` | `/apply/status` |
| `SOUL_ISSUED` | `/apply/status` |
| `ACTIVE` | `/dashboard` |

### Allowed Sibling Routes (Guard Exceptions)
- `/apply/status`: `LOGIN`, `ACTIVE` 외 모든 stage에서 접근 허용
- `/apply/identity`: `APPLY_START`에서 접근 허용
- `/apply/appeal`: `REJECTED`, `RESUBMIT_REQUIRED`, `EXCEPTION_REVIEW`, `APPEAL_PENDING`에서 접근 허용
- `/apply/documents`: `RESUBMIT_REQUIRED`에서 접근 허용

## 3. Stage Derivation Signals (Server)
서버는 아래 신호를 조합해 stage를 계산합니다.
- identity verified 여부 (`identity_claims`)
- liveness verified 여부 (`admission_applications.liveness_verified_at` 또는 `verified_claims.REAL_PERSON_VERIFIED`)
- consent completed 여부 (`consent_events` + policy version)
- required documents verified 여부 (`admission_document_submissions`)
- application status/current_step (`admission_applications`)
- soul credential issued 여부 (`soul_credentials`)
- cold-path 상태 (`appeals`, `exception_cases`, `audit_samples`, `audits`)
- freeze/banned 상태 (`profiles`)

## 4. Blockers and Recovery
`blockers`는 stage 산출 근거이며, UI는 blocker를 사용자 복구 경로로 직접 연결해야 합니다.

핵심 blocker 예시:
- `APPLICATION_NOT_STARTED` -> `/apply`
- `IDENTITY_REQUIRED` -> `/apply/identity`
- `LIVENESS_REQUIRED` -> `/apply/liveness`
- `CONSENTS_REQUIRED` -> `/apply/consents`
- `DOCUMENTS_REQUIRED` -> `/apply/documents`
- `RESUBMISSION_REQUIRED` -> `/apply/documents`
- `ADMISSION_REJECTED` -> `/apply/status` + `/apply/appeal`
- `EXCEPTION_REVIEW_REQUIRED` -> `/apply/status`
- `APPEAL_PENDING` -> `/apply/status`
- `AUDIT_REVIEW_PENDING` -> `/apply/status`
- `SOUL_ISSUANCE_PENDING` -> `/apply/status`
- `ACCOUNT_FROZEN` -> `/banned`

## 5. Redirect Rules

### Middleware (Coarse Gate)
`apps/web/utils/supabase/middleware.ts`
- 비인증 + 보호경로 접근 -> `/login`
- ACTIVE 전용 경로(`/dashboard`, `/match`, `/chat`, `/review`, `/report`, `/revoke`)는 ACTIVE 아닌 경우 `/apply/status`
- ACTIVE 사용자가 `/apply/*` 접근 시 `/dashboard`
- legacy 진입점(`/onboarding/*`, `/interview`, `/contract`, `/consent`, `/osint`, `/admin-verify`)은 stage에 맞게 redirect

### Client Guard (Fine Gate)
`apps/web/components/ssot-route-guard.tsx`
- `useStatus()` 결과의 stage와 현재 pathname을 비교
- 불일치 시 `resolveGuardRedirect()`로 canonical route로 교정
- `meta.is_frozen=true`면 `/banned` 우선

## 6. UI State Contract
모든 apply/active 화면은 최소 상태를 동일하게 유지합니다.
1. `loading`: status/API 조회 중 (skeleton)
2. `ready`: 사용자 입력 가능
3. `submitting`: action API 처리 중 (CTA disabled)
4. `error`: 복구 가능한 오류 + 재시도/이동 액션 제공
5. `syncing`: 현재 화면 stage 불일치 시 `StageTransitionNotice`로 안내

## 7. Architecture Note
- 서버가 stage/blockers/meta를 계산한다.
- 클라이언트는 status를 파싱/표시하고 route guard로 접근을 정렬한다.
- 클라이언트가 임의로 "다음 단계"를 확정하지 않는다. 항상 status 재조회 후 이동한다.
- ACTIVE 하위 기능은 API 계약을 기본으로 사용하며, 임시 adapter가 필요한 경우에만 명시적으로 분리한다.
