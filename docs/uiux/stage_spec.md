---FILE: docs/uiux/stage_spec.md ---
# Stage Specification (SSOT)

## 1. Stage Enum Definition
서버(`/api/me/status`)에서 내려오는 불변의 진실 데이터 상수.
- `LOGIN`: 미인증 상태. Auth Token 부재.
- `KYC`: 로그인 완료. 본인확인(통신사 실명 인증 등) 미완료.
- `QUALIFICATION`: 본인확인 완료. 자격 증명(거주지, 신체, 경력/학력) 미완료.
- `CONSENT_HUB`: 자격 증명 완료. 프라이버시 및 이용약관 동의 미완료.
- `E_SIGN`: 동의 완료. 전자 서명 절차 미완료.
- `AI_INTERVIEW`: 서명 완료. AI 면접 진행 중 혹은 대기.
- `DASHBOARD_READY`: 모든 온보딩/인터뷰 절차 완료. 메인 서비스 진입 가능.

## 2. Stage -> Route Mapping (Next.js App Router 기준)
모든 컴포넌트는 최상위 Layout이나 Middleware 단계에서 `GET /api/me/status`를 fetch 후 일치하지 않는 Route 접근 시 올바른 Route로 강제 Redirect 처리됨.
- `LOGIN` -> `/login`
- `KYC` -> `/onboarding/verify`
- `QUALIFICATION` -> `/onboarding/qualification`
- `CONSENT_HUB` -> `/onboarding/consent`
- `E_SIGN` -> `/onboarding/sign`
- `AI_INTERVIEW` -> `/interview`
- `DASHBOARD_READY` -> `/dashboard`

## 3. 진입/완료 조건 및 Blockers (서버 DB 기준)
*Blockers는 UI 내부 상수로 플로우 블록 사유를 명시합니다. Error Code는 3번 문서(error_code_ux_standard)를 참고하세요.*

| Stage | 진입조건(서버) | 완료조건(서버 일치 조건) | UI Blockers |
|---|---|---|---|
| `LOGIN` | 없음 | Supabase Auth JWT 유효함 | `['AUTH_MISSING']` |
| `KYC` | `auth.users` 존재 여부 확인 | `profiles.verified = true` OR `identity_claims` 테이블 데이터 존재 | `['IDENTITY_UNVERIFIED']` |
| `QUALIFICATION` | `KYC` 완료 조건 충족 | `verifications` 필수 타입들이 모두 `status = 'VERIFIED'` | `['DOCUMENT_MISSING']` |
| `CONSENT_HUB` | `QUALIFICATION` 완료 조건 충족 | `consents` 필수 module들이 `is_granted = true` | `['TERMS_NOT_ACCEPTED']` |
| `E_SIGN` | `CONSENT_HUB` 완료 조건 충족 | `contracts` 테이블 내 `signature` 및 `document_version` 값 존재 및 유효 | `['SIGNATURE_MISSING']` |
| `AI_INTERVIEW` | `E_SIGN` 완료 조건 충족 | `interviews.decision` 필드 존재 | `['INTERVIEW_INCOMPLETE']` |
| `DASHBOARD_READY` | `AI_INTERVIEW` 완료 조건 충족 | N/A | `[]` |

## 4. 공통 화면 상태 (UI States)
E2E 안정을 위해 모든 Onboarding 화면은 다음 4가지 상태만을 가짐.
1. `loading`: `/api/me/status` 혹은 진입 시 초기 데이터 fetch 중. (Skeleton 표시)
2. `ready`: 유저 입력 대기 중. (Form active)
3. `submitting`: Action API 호출 중. CTA disabled & Spinner 액티브.
4. `error`: API 에러 응답 수신. 

## 5. 전이 규칙 (중요)
UI 임의로 `router.push('/next-step')` 호출은 **절대 금지**됩니다. 모든 화면 이동 및 롤백은 서버의 진실에 의존합니다.
1. 유저 CTA 클릭 -> Action API 호출.
2. API 응답 200 OK 수신.
3. 즉시 `GET /api/me/status` 캐시 무효화 및 재조회.
4. 새로 내려온 `stage` 값에 의하여 전역 Route Controller가 자동으로 Redirect 수행.
- **예외 시나리오 (강제 튕김)**: 대시보드 강제 튕김 등 (동의 철회, 서명 무효화, 밴 처리 발생 시). 유저 액션 직후 또는 주기적 `status 재조회` 시 서버가 이전 `stage`나 에러를 응답하면 즉각 **해당 stage로 강제 리다이렉트** 합니다.
---END FILE---
