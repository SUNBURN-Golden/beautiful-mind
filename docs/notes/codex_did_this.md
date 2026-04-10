# codex_did_this

작성 시각: 2026-02-27

## 목표
온보딩/인터뷰 플로우에서 실제로 시작부터 막히던 계약 불일치를 한 번에 정리했다.
요청한 3개 이슈(인터뷰, 동의 인증, 자격요건)를 우선 해결하고, 연동 중 추가로 드러난 상태 계약 불일치도 같이 맞췄다.

## 1) 인터뷰 플로우 계약 불일치 수정

### 문제
- 프론트는 `/api/interview/next`를 처음 호출할 때 `interview_id` 없이, `last_answer: null`로 호출.
- 백엔드는 `interview_id`, `last_answer`를 모두 필수로 막아서 첫 질문 생성이 실패.
- 동의 체크도 `deep_profiling` 단일 플래그만 강제해서 현재 consent 저장 구조(module 기반)와 충돌 가능.

### 수정
- 파일: `apps/web/app/api/interview/next/route.ts`
- 초기 호출 허용으로 변경:
  - `interview_id` 없으면 최근 `IN_PROGRESS` 인터뷰를 찾고,
  - 없으면 새 인터뷰를 자동 생성.
- `last_answer`는 선택값으로 처리:
  - 값이 있을 때만 transcript에 user 메시지 추가.
- 동의 검증을 이중 호환으로 변경:
  - `OSINT/LOCATION/DEVICE` 3개 모듈 동의 OR
  - legacy `deep_profiling=true`
  중 하나면 통과.
- 응답에 항상 `interview_id`를 포함하도록 변경.
- Gemini 응답 파싱 실패 대비 fallback question/progress 로직 추가.

- 파일: `apps/web/app/(guarded)/interview/page.tsx`
- 프론트에서 `interview_id`를 state로 보관하고 후속 질문 요청 시 함께 전송하도록 변경.
- 훅 의존성/에러 타입 정리(useCallback + catch 타입 정리).

## 2) Consent 단계 인증 방식 불일치 수정

### 문제
- 프론트는 쿠키 기반 호출.
- 백엔드는 Authorization 헤더 없으면 401.

### 수정
- 파일: `apps/web/app/api/consent/submit/route.ts`
- 인증 방식을 확장:
  - Authorization 헤더 있으면 토큰 인증,
  - 없으면 `createServerClient + cookies`로 세션 인증.
- consent upsert 시 인터뷰 연동에 필요한 필드도 함께 저장:
  - `terms_accepted`, `privacy_accepted`, `deep_profiling`, `marketing_accepted`.

## 3) Qualification 단계 완료 어려움 수정

### 문제
- 프론트는 `RESIDENCE`만 업로드.
- 백엔드 상태판정은 `RESIDENCE + PHYSICAL + (CAREER|EDUCATION)` 요구.

### 수정
- 파일: `apps/web/app/(guarded)/onboarding/(flow)/qualification/page.tsx`
- 하드코딩(`RESIDENCE`) 제거.
- `/api/me/status`가 내려주는 `details.missing_types` 기준으로 제출 대상 타입을 동적으로 계산.
- `CAREER_OR_EDUCATION`은 `CAREER` 제출로 해석해 자동 포함.
- 한 번 제출 시 누락 타입들을 순차 업로드하도록 변경.
- 화면에 현재 제출 대상 타입 표시.

- 파일: `apps/web/app/api/me/status/route.ts`
- 기존 `details.missing_types` 유지 + `meta.required_verifications`도 함께 채워 프론트 계약 호환성 강화.
- 인터뷰 완료 판정 시 인터뷰 조회에 `created_at desc` 정렬 추가(최신 인터뷰 기준으로 판정).

- 파일: `apps/web/app/api/verify/upload/route.ts`
- 인증 방식 확장(Authorization 헤더 또는 쿠키 세션).
- 테스트 스킵 업로드(`skip_file=true`)이고 `NEXT_PUBLIC_ALLOW_TEST_FEATURES=true`인 경우 `VERIFIED`로 저장되게 처리(테스트/데모 플로우에서 단계 진행 가능).

## 4) 상태 훅(useStatus) 계약 보강

### 문제
- 상태 응답 타입이 느슨하고, 401 시 클라이언트 처리 일관성이 약함.

### 수정
- 파일: `apps/web/lib/useStatus.ts`
- 상태 payload 파서/에러 파서 추가(타입 안정화).
- `/api/me/status`가 401이면 `/login`으로 즉시 이동하도록 처리.
- `blockers`를 string[]로 강제 정규화.

## 검증
수정한 파일 대상으로 ESLint 실행:

```bash
pnpm exec eslint \
  'app/api/interview/next/route.ts' \
  'app/api/consent/submit/route.ts' \
  'app/(guarded)/onboarding/(flow)/qualification/page.tsx' \
  'app/api/verify/upload/route.ts' \
  'app/api/me/status/route.ts' \
  'lib/useStatus.ts' \
  'app/(guarded)/interview/page.tsx'
```

결과: 에러/경고 없이 통과.

## 변경 파일 목록
- apps/web/app/api/interview/next/route.ts
- apps/web/app/(guarded)/interview/page.tsx
- apps/web/app/api/consent/submit/route.ts
- apps/web/app/(guarded)/onboarding/(flow)/qualification/page.tsx
- apps/web/app/api/me/status/route.ts
- apps/web/app/api/verify/upload/route.ts
- apps/web/lib/useStatus.ts
- codex_did_this
