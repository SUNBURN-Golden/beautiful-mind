# User Interface (UI) Screens & Copywriting

Beautiful Mind MVP의 사용자 화면 목록과 프리미엄 톤(Premium & Trustworthy)을 적용한 핵심 카피라이팅입니다. 심플하고 절제된 언어를 통해 '보안성'과 '사용자 주권'을 강조합니다.

## 1. Onboarding & Registration (온보딩 및 권한 동의)
- **Screen:** `Splash / Intro`
  - **Copy:** "보이지 않는 진실을 증명하는 단 하나의 기준. Beautiful Mind에 오신 것을 환영합니다."
- **Screen:** `Sign Up (Legal & Consent)`
  - **Copy:** "안전하고 투명한 환경을 위해 필수적인 절차입니다. 본 약관은 고객님의 권리와 프라이버시를 보호하기 위해 마련되었습니다."
  - *(참고: 하단 약관 전문은 `docs/legal`에서 원본 텍스트를 수정 없이 불러와 렌더링. 하단부 '동의하고 계속하기' 버튼 활성화 여부로 제어)*

## 2. Main Dashboard (메인 대시보드 및 평판)
- **Screen:** `Home`
  - **Copy:** "현재 고객님의 프로필 신뢰도는 **최상의 상태(Tier 1)** 입니다." / "투명하게 증명되고, 안전하게 보호받고 있습니다."
- **Screen:** `Verification Status Card (모듈별 상태 위젯)`
  - **Copy:** (기기) "기기 무결성 검증 완료" / (위치) "위치 인증 로그 활성화 됨"

## 3. Consent Management (명시적 동의 원칙 - 설정 탭)
- **Screen:** `Privacy & Verification Settings`
  - **Copy:** "고객님의 정보는 오직 고객님의 철저한 통제 하에 있습니다."
  - **OSINT Toggle Copy:** "공개 정보 기반 평판 및 신뢰도 분석 (현재: 허용됨) — [권한 철회하기]"
  - **Location Toggle Copy:** "실시간 위치 기반 교차 무결성 검증 (현재: 인증 세션 중 활성화) — [권한 철회하기]"
  - **Opt-out Alert Copy:** "해당 접근 권한을 철회하시겠습니까? 철회하는 즉시 관련된 모든 모듈의 시스템 접근이 영구적으로 차단되며, 데이터 분석이 즉각 중단됩니다." — [예, 철회합니다]

## 4. Threat & Penalty Process (위협 방어, 신고 및 소명)
- **Screen:** `Report User` (신고자용 화면)
  - **Copy:** "신뢰를 훼손하는 중대한 행위를 발견하셨나요? 상세히 알려주시면 엄격한 내부 프로세스를 거쳐 조치하겠습니다."
  - **Legal Consent Checkbox Copy:** "주의: 본 신고 체계를 악용하여 타인을 고의로 음해하거나 담합/허위 신고할 경우, 역패널티 및 강력한 계정 제한 조치가 취해질 수 있음에 온전히 동의합니다."
- **Screen:** `Penalty Warning & Appeal` (제재 당사자용 소명 화면 - 프로세스 기반 제재)
  - **Copy:** "고객님의 계정에서 비정상적인 활동 패턴이 감지되어, 일부 서비스 이용이 일시적으로 보류되었습니다."
  - **Sub Copy:** "Beautiful Mind는 무결하고 정의로운 생태계를 지향합니다. 오탐지이거나 시스템 오류라고 판단되실 경우, 아래 절차를 통해 소명해 주시길 바랍니다." — [소명 절차 시작하기]
