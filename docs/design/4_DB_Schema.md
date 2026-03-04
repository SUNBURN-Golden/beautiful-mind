# DB Schema & RLS Policy 초안

MVP 구현을 위한 기초 데이터베이스 스키마 및 RLS(Row Level Security) 정책 개요입니다. 모듈별 독립성과 프라이버시 원칙에 따라 테이블과 권한을 설계합니다.

## 1. Tables (스키마 구조)

### 1) Auth & Consent 코어
- **`users`**
  - `id` (uuid, PK) : Auth Provider UID 연동
  - `email` (string, Unique)
  - `reputation_score` (int, default: 100)
  - `created_at` (timestamp)
- **`consents`** (권한/동의 중앙 관리)
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to users.id)
  - `module` (enum: 'OSINT', 'LOCATION', 'DEVICE')
  - `is_granted` (boolean, default: false)
  - `granted_at` (timestamp)
  - `revoked_at` (timestamp, null true)

### 2) Verification 코어 (OSINT / Location / Device)
- **`osint_profiles`**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to users.id, Unique)
  - `trust_score` (int)
  - `last_verified_at` (timestamp)
- **`location_logs`**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to users.id)
  - `lat` (numeric) / `lng` (numeric)
  - `ip_address` (string)
  - `is_spoofed` (boolean, 위치 조작 의심 플래그)
  - `captured_at` (timestamp)
- **`device_integrity`**
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to users.id)
  - `device_fingerprint` (string, hash)
  - `is_rooted` (boolean)
  - `checked_at` (timestamp)

### 3) Penalty 코어
- **`reports_and_penalties`**
  - `id` (uuid, PK)
  - `reporter_id` (uuid, FK to users.id)
  - `target_id` (uuid, FK to users.id)
  - `report_type` (enum)
  - `status` (enum: 'PENDING', 'WARNING', 'RESTRICTED', 'DISMISSED')
  - `is_false_report` (boolean, 허위신고 판별 시 true)
  - `created_at` (timestamp)

## 2. Row Level Security (RLS) 정책

프라이버시 최우선 원칙에 따라, 데이터 접근을 유저 및 코어 모듈 단위로 엄격히 제한합니다.

1. **`users` 테이블**
   - **SELECT:** `auth.uid() == id` 본인 전체 정보 조회 가능. 타인 정보는 별도의 보안 뷰(View)를 통해 마스킹된 일부 요소(`reputation_score` 등)만 제한적 접근 가능.
   - **UPDATE:** `auth.uid() == id` 본인만 가능 (상태 및 Score 변경은 Service Role만 허용).
2. **`consents` 테이블**
   - **SELECT / INSERT / UPDATE:** `auth.uid() == user_id` 본인 소유의 동의 내역만 가능. 앱 설정에서 철회 시 `is_granted = false` 로 전환.
3. **`osint_profiles`, `location_logs`, `device_integrity` 테이블**
   - **SELECT:** `auth.uid() == user_id` 본인 데이터만 절대적 조회 허용 (타인은 어떠한 권한으로도 열람 불가).
   - **INSERT / UPDATE:** 클라이언트(웹/앱) 단에서 직접 DB 접근(Insert) 전면 차단. 오직 명시적 동의와 데이터 유효성 검증을 거친 코어 백엔드 API(Service Role)만이 데이터를 추가/수정 가능.
4. **`reports_and_penalties` 테이블**
   - **SELECT:** 본인이 신고한 내역(`reporter_id == auth.uid()`) 및 본인에 대한 제재 진행 상태(`target_id == auth.uid()`)만 제한적 조회 가능. 누가 신고했는지는 타겟에게 완벽히 블라인드 처리됨 (보복 방지).
   - **INSERT:** 신고 생성 프로세스 및 법적 책임 동의(Docs/legal 연동)를 통과한 경우에 한해 등록 허용.

## 3. 핵심 규칙: Backend-Mediated Access
- **클라이언트는 DB를 직접 제어해선 절대 안 됩니다.**
- 데이터의 C/U/D (생성/수정/삭제) 작업은 반드시 코어 API 서버(Auth, OSINT, Location, Device)에서 `consents` 테이블 조회를 통해 동의 권한이 유효한지 1차 락킹(Lock)을 확인한 뒤에만 작동하도록 설계합니다.
