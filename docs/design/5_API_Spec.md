# API Specification (Core Modules)

Beautiful Mind MVP의 백엔드 API 명세입니다. 극대화된 보안과 프라이버시 보호를 위해 Auth, OSINT, Location, Device, Penalty 모듈을 완전히 분리된 마이크로 라우트로 설계했습니다.

## 공통 헤더 및 권한 검증 (API Gateway / Authorizer)
- **Authorization:** `Bearer <JWT_TOKEN>`
- **공통 로직:** 모든 타겟 API는 JWT 토큰 내 `sub`(user_id)를 검증하며, DB의 `consents` 테이블에 기록된 동의 여부(`is_granted == true`)를 **반드시 가장 먼저 확인(1차 게이트웨이)**합니다. 동의가 없는 호출은 즉각 `403 Forbidden`을 반환합니다.

---

## 1. Auth & Consent Module (`/api/v1/auth`)

### [POST] `/api/v1/auth/consent`
- **Desc:** 특정 모듈에 대한 명시적 동의(Opt-in) 및 철회(Opt-out)
- **Role:** Authenticated User
- **Request:**
  ```json
  {
    "module": "OSINT", // or "LOCATION", "DEVICE"
    "is_granted": true // or false
  }
  ```
- **Response:** `200 OK`
- **Mitigation:** 철회(`is_granted: false`) 시 관련된 캐시 및 권한 토큰 즉시 만료 처리.

---

## 2. OSINT Verification Module (`/api/v1/osint`)

### [POST] `/api/v1/osint/analyze`
- **Desc:** 공개 데이터 기반 사용자의 신뢰도 점수 산출 타스크 큐 등록 (비동기)
- **Role:** Authenticated User (Requires `OSINT` consent)
- **Request:** Payload 없음 (백엔드가 User ID 연동 데이터 소스 직접 접근)
- **Response:** `202 Accepted` | `{"status": "processing"}`

### [GET] `/api/v1/osint/result`
- **Desc:** 산출된 내 신뢰도 점수 및 검증 결과 리턴 (본인만 조회 가능)
- **Role:** Authenticated User
- **Response:** `200 OK` | `{"trust_score": 98, "last_verified_at": "..."}`

---

## 3. Location Verification Module (`/api/v1/location`)

### [POST] `/api/v1/location/verify`
- **Desc:** 클라이언트 GPS 좌표를 입력받아, 서버에서 측정한 Network IP 위치와 비교 및 스푸핑 감지
- **Role:** Authenticated User (Requires `LOCATION` consent - 1회성 또는 세션 한정)
- **Request:**
  ```json
  { "lat": 37.5665, "lng": 126.9780 }
  ```
- **Response:** `200 OK`
- **Mitigation:** 스푸핑(조작) 의심 시 에러가 아닌 로깅을 통해 DB에 `is_spoofed: true` 마킹 후 Penalty 모듈로 신호 전달.

---

## 4. Device Integrity Module (`/api/v1/device`)

### [POST] `/api/v1/device/verify`
- **Desc:** 앱/OS 수준에서 발급받은 무결성 토큰(AppAttest/Play Integrity)을 검증하여 Jailbreak/Rooting 탐지
- **Role:** Authenticated User (Requires `DEVICE` consent)
- **Request:**
  ```json
  {
    "platform": "ios",
    "integrity_token": "eyJhb..."
  }
  ```
- **Response:** `200 OK` | `{"verified": true, "is_rooted": false}`

---

## 5. Penalty & Reporting Module (`/api/v1/penalty`)

### [POST] `/api/v1/penalty/report`
- **Desc:** 타 사용자에 대한 악용/규정 위반 신고. (명시적 법적 책임 동의 필수)
- **Role:** Authenticated User
- **Request:**
  ```json
  {
    "targetUserId": "uuid...",
    "reportType": "FRAUD_OR_COLLUSION",
    "legal_consent_agreed": true // View 단에서 docs/legal 내용 동의 시 true 전달
  }
  ```
- **Response:** `201 Created`
- **Mitigation:** 즉각적인 계정 정지 호출 대신 규칙 엔진을 통해 **"보류(PENDING)"** 상태로 등록됨. 자동 영구 정지 호출 불가.
