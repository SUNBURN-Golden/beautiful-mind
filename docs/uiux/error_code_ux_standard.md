# Error Code UX Standard (Admission-First)

## 1. 원칙
- 오류 발생 시 사용자를 dead-end에 두지 않는다.
- 모든 오류 상태는 `재시도` 또는 `현재 단계로 이동` 액션을 제공한다.
- stage 전이는 서버 SSOT(`GET /api/me/status`) 재조회 결과로만 확정한다.

## 2. Blocker vs API Error Mapping

| UI Blocker | API Error Code | 의미 / 대응 |
|---|---|---|
| `AUTH_MISSING` | `AUTH_REQUIRED` / `UNAUTHORIZED` | 로그인 필요, `/login` 이동 |
| `APPLICATION_NOT_STARTED` | `START_FAILED` | admission 시작 실패, `/apply` 재시도 |
| `IDENTITY_REQUIRED` | `PORTONE_VERIFICATION_FAILED`, `NAME_MISMATCH`, `PHONE_MISMATCH` | 신원 검증 실패, `/apply/identity` 재시도 |
| `LIVENESS_REQUIRED` | `LIVENESS_VERIFY_FAILED`, `PURGE_CONFIRM_REQUIRED` | liveness 제출 실패, `/apply/liveness` 재시도 |
| `CONSENTS_REQUIRED` | `CONSENT_SUBMIT_FAILED`, `ACK_PHRASE_MISMATCH` | 동의 제출 실패, `/apply/consents` 재시도 |
| `DOCUMENTS_REQUIRED` | `DOCUMENT_UPLOAD_FAILED`, `DOCUMENT_AI_SUBMIT_FAILED` | 문서 처리 실패, `/apply/documents` 재시도 |
| `RESUBMISSION_REQUIRED` | `RESUBMIT_REQUIRED` | 재제출 필요, `/apply/documents` |
| `ADMISSION_REJECTED` | `ADMISSION_REJECTED` | 거절 확정, `/apply/status` + `/apply/appeal` |
| `EXCEPTION_REVIEW_REQUIRED` | `EXCEPTION_REQUIRED` | 예외 큐 진행 중, `/apply/status` 대기 |
| `APPEAL_PENDING` | `APPEAL_PENDING` | 항소 큐 진행 중, `/apply/status` 대기 |
| `AUDIT_REVIEW_PENDING` | `AUDIT_REVIEW_PENDING` | 감사 큐 진행 중, `/apply/status` 대기 |
| `ACCOUNT_FROZEN` | `FROZEN` | `/banned` 고정 |
| N/A | `BANNED` | 강제 로그아웃 + `/login?error=ACCOUNT_BANNED` |

## 3. 에러코드별 UX 정책

### `AUTH_REQUIRED` / `UNAUTHORIZED` (401)
- 메시지: "세션이 만료되었습니다. 다시 로그인해 주세요."
- 액션: `/login` 이동

### `BANNED` (403)
- 메시지: "이용이 제한된 계정입니다."
- 액션: 지원 채널 안내

### `START_FAILED` / `INTERNAL_ERROR` (5xx)
- 메시지: "신청을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요."
- 액션: `/apply` 재시도

### `PORTONE_VERIFICATION_FAILED` / `NAME_MISMATCH` / `PHONE_MISMATCH` (4xx)
- 메시지: "신원 검증 결과가 일치하지 않습니다. 입력값과 검증 ID를 확인해 주세요."
- 액션: `/apply/identity` 재시도

### `LIVENESS_VERIFY_FAILED` / `PURGE_CONFIRM_REQUIRED` (4xx)
- 메시지: "실재 인물 검증 제출을 완료하지 못했습니다."
- 액션: `/apply/liveness` 재시도

### `CONSENT_SUBMIT_FAILED` / `ACK_PHRASE_MISMATCH` (4xx)
- 메시지: "필수 동의 항목 또는 확인 문구를 다시 확인해 주세요."
- 액션: `/apply/consents` 재시도

### `DOCUMENT_UPLOAD_FAILED` / `DOCUMENT_AI_SUBMIT_FAILED` (4xx/5xx)
- 메시지: "문서 업로드 또는 AI 판독 처리에 실패했습니다."
- 액션: `/apply/documents` 재시도

### `REVIEW_SUBMIT_FAILED` (4xx/5xx)
- 메시지: "AI 자동결정을 실행하지 못했습니다."
- 액션: `/apply/review` 재시도

### 네트워크 오류 / 429
- 메시지: "연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요."
- 액션: 폼 입력 유지 + 수동 재시도
