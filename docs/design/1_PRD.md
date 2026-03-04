# SoulBound MVP 1-Pager PRD

## 1. 제품 목적 (Product Vision)
SoulBound는 사용자의 정보(OSINT, 위치, 기기 등)를 투명하고 안전하게 검증하는 프리미엄 신뢰 검증 플랫폼입니다. 모든 민감 정보 접근 및 패널티 부과는 철저한 **명시적 동의(Explicit Consent) 및 프로세스 기반**으로 동작하며, 불법/악용(담합, 허위신고 등)을 방지하는 강력한 무결성 검증 환경을 제공합니다.

## 2. 핵심 타겟 (Target Audience)
- 상호 신뢰를 위해 정확한 신원/위치/기기/OSINT 기반의 정보가 필요한 사용자 및 그룹
- 프라이버시 침해를 최소화하면서도 법적 근거와 투명한 절차가 보장된 프리미엄 환경을 원하는 사용자

## 3. 핵심 기능 (Core Features) - MVP
*OSINT / 위치 / 기기 / 패널티 기능은 모두 "명시적 동의" 프로세스를 필수 전제로 합니다.*

1. **사용자 온보딩 및 인증 (Auth & Consent)**
   - 프리미엄 톤의 단계별 가입 및 법적 고지(docs/legal 텍스트 전용 읽기 파이프라인 활용)
   - 민감 정보 조회에 대한 명시적 동의(Opt-in) 및 철회(Opt-out) 기능
2. **OSINT 및 기기/위치 검증 모듈 (Verification Modules)**
   - **OSINT 검증:** 공개 데이터 기반 사용자 신뢰도 스코어링 (명시적 동의 기반)
   - **위치 검증:** 실시간 GPS/네트워크 기반 위치 인증 (1회성 동의 또는 세션 한정 권한)
   - **기기 검증:** 기기 고유값, 시스템 무결성(Jailbreak/Rooting 등) 체크 (동의 기반)
3. **위협 상쇄 및 패널티 시스템 (Threat Mitigation & Penalty)**
   - 허위신고, 담합(특정 그룹 간의 조작) 모니터링 로직
   - 프로세스 기반의 패널티 부과 (사전 경고 -> 소명 기회 -> 서비스 제한 -> 계정 정지)
4. **코어 모듈 분리 (Core Module Separation)**
   - API와 서비스 로직을 독립적인 모듈(Auth, OSINT, Location, Device, Penalty, Audit)로 분리 (유지보수 및 보안성 강화)

## 4. 제약 사항 (Constraints)
- **Legal Compliance:** 모든 약관, 정책 및 법적 고지 문구는 `docs/legal`의 텍스트를 수정 없이 File-read 전용으로만 렌더링.
- **Privacy First:** 수집된 모든 민감 정보는 철저한 RLS(Row Level Security) 정책으로 사용자 격리.

## 5. 성공 지표 (Success Metrics)
- 민감정보 동의/철회 프로세스의 전환율 및 완료율
- 허위신고 및 담합 시도의 조기 차단율 (Threat Detection Rate)
- 시스템 무결성 및 모듈 안정성 (코어 모듈별 독립 에러율 격리 점검)
