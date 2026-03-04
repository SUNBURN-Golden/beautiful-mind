# Phase 6: E2E Frontend Flow Wizard - Definition of Done Checklist

## 1. TBD 0개 및 BLOCKED 명시 확인
- [x] 프론트엔드 코드 내 추측성 TBD 완전히 제거.
- [x] 백엔드 경로가 물리적으로 존재하지 않는 `api/consent/submit` 및 `api/contract/sign` 호출부는 `// BLOCKED: 확인 필요` 코멘트로 명시 완료.
- [x] `api/verify/complete` 등 기존 경로가 존재하는 API는 정상적으로 `fetch` 연동.

## 2. router.push() 사용 0개 (상태 전이 완전 SSOT화)
- [x] UI/UX 컴포넌트 내부에서 강제로 `router.push('/next-step')` 호출하는 로직 근절.
- [x] Action API `200 OK` 수신 시 오직 `refetch()`(status fetch)만 수행.
- [x] `layout.tsx` + `useStatus.ts` 전역 라우트 가드가 `GET /api/me/status` 응답의 `stage` 열거형에 따라 강제 리다이렉트를 독점 수행 보장.

## 3. Real E2E Playwright 연결 세팅 완료
- [x] `/api/me/status` 모킹 제거, 실제 Local 서버/DB 연동 기반 테스트 작성 (`onboarding-real.spec.ts`).
- [x] E2E 구동을 위한 로컬 백엔드 DB 초기화 및 E2E 테스트 유저 시드 스크립트 마련 (`scripts/e2e_local_reset_seed.sh`).
- [x] 뒤로가기 방어, 401 킥아웃, 강제 URL 진입 방어 등의 8가지 시나리오 검증 로직 확보.

## 4. 증적(Receipt) 중심의 UI 및 최소 Audit 컴포넌트 마운트
- [x] Dashboard 페이지에 Contract Version, Receipt ID(해시), Time Bucket 등 사실 기반 정보 렌더링.
- [x] `components/ui-kit.tsx` 내에 `AuditLogRow`를 추가, 사용자향 이벤트(CONSENT_SIGN, CONTRACT_SIGNATURE 등)만 필터링하여 노출할 수 있는 UI 뼈대 마련 완료.
- [x] UI 과장에 대한 "블록체인/스마트컨트랙트" 용어 제거 -> "감사 로그 격리", "증명 해시", "서명 영수증" 등 사실적인 표현으로 교체.
