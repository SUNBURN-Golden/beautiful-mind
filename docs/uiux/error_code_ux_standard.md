---FILE: docs/uiux/error_code_ux_standard.md ---
# Error Code UX Standard

## 1. UX 표준 원칙
오류 발생 시 사용자를 방치하지 않습니다. 모든 API 응답 명세 코드는 정해진 템플릿과 명확한 리다이렉트 논리를 동반해야 합니다. 네트워크 오류 또는 `401 Unauthorized` 발생 시 가장 안전한 복구를 위해 즉시 `status 재조회` → 실패 시 `/login` 리다이렉트를 규칙으로 삼습니다.

## 2. Blockers (UI 내부 상수) vs Error Codes (API 응답) 매핑표
- **UI Blockers**: 클라이언트가 다음 화면으로 넘어가는 렌더링을 차단할 때 쓰는 내부 요인 집합입니다 (예: `['AUTH_MISSING']`).
- **Error Codes**: 서버가 API 트랜잭션 실패를 선언할 때 반환하는 HTTP JSON 규격 에러 코드입니다 (예: `AUTH_REQUIRED`).

| UI Blocker | API Error Code | 의미 / 대응 |
|---|---|---|
| `AUTH_MISSING` | `AUTH_REQUIRED` | 로그인이 해제됨. `/login` 으로 강제 튕김 |
| `IDENTITY_UNVERIFIED` | `KYC_FAILED` / `PORTONE_ERROR` | KYC 서드파티 장애 또는 불일치. 재시도 유도 |
| `DOCUMENT_MISSING` | `QUALIFICATION_REQUIRED` | 필수 서류 누락상태에서 접근. status 재조회 후 튕김 |
| `TERMS_NOT_ACCEPTED` | `CONSENT_REQUIRED` | 필수 동의 누락. status 재조회 후 튕김 |
| `SIGNATURE_MISSING` | `VERSION_MISMATCH` | 약관 변경으로 구버전 제출 시 튕김. 문서 새로고침 |
| N/A (Global block) | `BANNED` | 영구 정지 유저. 모든 화면 접근 불가. support 전환 |

## 3. 에러코드별 세부 UX 정책

### `AUTH_REQUIRED` (HTTP 401)
- **메시지 템플릿**: "세션이 만료되었습니다. 안전한 진행을 위해 다시 로그인해주세요."
- **권장 액션**: `redirect` (-> `/login`)
- **로직**: 즉시 status 재조회 시도 후 401 지속 확정 시 로컬 캐시를 폐기하고 로그인 화면으로 전환.

### `BANNED` (HTTP 403)
- **메시지 템플릿**: "플랫폼 이용이 제한된 계정입니다."
- **권장 액션**: `support` (고객센터 링크 노출)
- **로직**: 전체 서비스 UI Lock 처리.

### `KYC_FAILED` / `PORTONE_ERROR` (HTTP 400/502)
- **메시지 템플릿**: "본인 인증 기관 응답이 지연되거나 정보가 일치하지 않습니다. 다시 시도해주세요."
- **권장 액션**: `retry`
- **로직**: 써드파티(KYC) 장애 시 자동 우회 처리하지 않고 백오프(3초 대기) 적용 후 재시도 버튼을 활성화.

### `VERSION_MISMATCH` (HTTP 409)
- **메시지 템플릿**: "서명하시려는 문서의 버전이 업데이트되었습니다. 변경된 내용을 다시 확인해주세요."
- **권장 액션**: `reload` 
- **로직**: 서명 모달 렌더링 후 정책이 변경되어 백엔드가 반려 시, 문서 본문을 최신화 후 서명을 비웁니다.

### `QUALIFICATION_REQUIRED` / `CONSENT_REQUIRED` (HTTP 403)
- **메시지 템플릿**: "이전 단계의 필수 정보가 누락되었습니다."
- **권장 액션**: `back` -> status 재조회
- **로직**: 클라이언트 앱의 라우터를 임의 조작해 강제 진입을 시도할 때 백엔드가 거절하는 코드입니다. status를 재조회하여 적합한 stage 라우트로 강제 복귀시킵니다.

### 네트워크 오류 / RATE LIMIT (Fetch Fail / HTTP 429)
- **메시지 템플릿**: "요청이 너무 많거나 연결이 원활하지 않습니다. 잠시 후 자동 재시도합니다."
- **권장 액션**: `retry`
- **로직**: 폼 입력 데이터 소실 방지 처리.
---END FILE---
