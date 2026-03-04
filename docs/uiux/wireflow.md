---FILE: docs/uiux/wireflow.md ---
# Wireflow & Edge Case Handling

## 1. 정상 흐름 (Happy Path)
1. `/login` 진입 -> 이메일/소셜 로그인 성공 시 `/api/me/status` 1차 호출 -> `KYC` 강제 리다이렉트.
2. `/onboarding/verify` 진입 -> 본인 인증 절차 완료 -> `POST /api/verify/complete` 200 OK -> 상태 호출 -> `QUALIFICATION` 강제 이동.
3. `/onboarding/qualification` 진입 -> 서류 업로드 API 200 OK -> 상태 호출 -> `CONSENT_HUB` 강제 이동.
4. `/onboarding/consent` 진입 -> 필수 동의 클릭 -> 저장 API 200 OK -> 상태 호출 -> `E_SIGN` 강제 이동.
5. `/onboarding/sign` 진입 -> 서명 완료 -> 제출 API 200 OK -> 상태 호출 -> `AI_INTERVIEW` 강제 이동.
6. `/interview` 진입 -> 대화 종료 API (`/api/interview/finalize`) 200 OK -> 상태 호출 -> `/dashboard` 진입 완료.

## 2. 엣지케이스 핸들링 필수 요건

### 2.1 새로고침 / 뒤로가기 / 다기기 병렬 로그인 방어 (Resume)
- **상황**: 유저가 `E_SIGN` 화면에서 브라우저 뒤로가기를 눌러 `CONSENT_HUB`로 이동 시도.
- **방어**: Layout Provider가 페이지 마운트 시 무조건 `GET /api/me/status`를 fetch. DB 기준 Status가 여전히 `E_SIGN`이므로 프론트엔드는 `CONSENT_HUB` 렌더커링 직전 `E_SIGN`으로 다시 튕겨냅니다. 기기가 달라도 DB SSOT를 따르므로 Resume이 항상 보장됩니다.

### 2.2 KYC 취소 vs 에러 분기
- **상황**: 통신사 팝업 창을 유저가 스스로 닫음 vs 통신사 연동 서버 내부 500 장애.
- **방어**: 유저 취소 이벤트는 "사용자가 인증을 취소했습니다" 토스트를 띄우고 상태 유지. 서버 수신 오류(`PORTONE_ERROR`) 시에는 에러 UX를 표출하고 3초 뒤 Retry를 유도합니다.

### 2.3 대시보드 강제 튕김 시나리오 (동의 철회/서명 무효화/Ban)
- **상황**: 대시보드 진입 후 유저가 동의 항목을 철회하거나, 관리자가 Ban 처리함.
- **방어**: Status 재조회 로직에 의존합니다. 페이지간 이동 또는 백그라운드 폴링 시점의 `GET /api/me/status` 결과가 `<이전 Stage>` 혹은 블록을 리턴하면, 프론트엔드 라우터는 대시보드 렌더링을 중단하고 **즉시 해당 Stage(예: `/onboarding/consent`) 또는 Error Page로 강제 리다이렉트** 합니다. 화면 탈출구는 철회 복구밖에 없습니다.

### 2.4 서명 중 문서 버전 업데이트 충돌
- **상황**: 서명 화면 진입 후 제출 직전 서버 측 약관 업데이트 발생(버전 불일치).
- **방어**: `POST /contract/sign (TBD)` 호출이 `VERSION_MISMATCH` (409) 리턴. UI는 문서를 최신 버전으로 강제 리로드하고 서명 패드를 빈 상태로 초기화하여 재서명을 요구합니다.

### 2.5 인터뷰 중 이탈/오프라인 (마지막 저장 지점 재개)
- **상황**: 챗봇 인터뷰의 3번 질문 직후 네트워크 단절 또는 앱 종료.
- **방어**: 인터뷰 중간 과정(History)은 API에 지속 저장됨. 새로고침 후 진입 시 상태가 여전히 `AI_INTERVIEW`이고, 인터뷰 컴포넌트 마운트 시 `GET /api/interview/next` 또는 History를 호출하여 **가장 마지막 저장 지점부터 단절 없이 재개**합니다.
---END FILE---
