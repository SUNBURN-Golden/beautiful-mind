---FILE: docs/uiux/design_system_tokens.md ---
# Design System Tokens - "Quiet Authority"

정숙한 권위(Quiet Authority)는 불필요한 장식을 배제하고 논리적 간격, 정밀한 타이포그래피, 그리고 절제된 색상을 통해 '관공서 이상의 신뢰도'와 '현대적 우아함'을 동시에 추구합니다. 특정 색상 코드는 예시 규칙일 뿐 테마에 맞춰 변경될 수 있습니다.

## 1. Core Tokens
### Spacing (px)
- `4`, `8`, `12` (Micro: 컴포넌트 내부 간격)
- `16`, `24` (Component: 섹션, 입력창 사이 간격)
- `32`, `48`, `64` (Layout: 화면 여백, 섹션 간격)

### Radius (px)
- 모서리를 너무 둥글게 하지 않아 신뢰감을 줍니다.
- `8` (Buttons, Inputs)
- `12` (Cards, Modals)
- `16` (BottomSheet, Large Overlays)

### Typography (Inter / Pretendard 혼용 권장)
- `Scale`: 12, 14, 16(Body), 20(H3), 24(H2), 32(H1)
- `Line Height`: Body는 `1.6`, Heading은 `1.3`을 고정 기준선으로 권장. Heading은 정밀함을 위해 `-0.01em` 수준의 자간 트래킹을 적용.
- `Weight`: Regular(400), Medium(500: Button), SemiBold(600: Heading)

### Shadow & Elevation
- 선을 과도하게 쓰지 않고 옅은 그림자로 구분합니다.
- `Shadow-Sm`: 최소한의 띄움용 그림자 속성. (예: `0 2px 8px rgba(0,0,0,0.04)`)
- `Shadow-Md`: 모달, 영수증 팝업 등 명확한 레이어 분리용 그림자.

### Color Palette (규칙 기반)
- 베이스는 무채색(탈색)을 유지하며 **오직 1개의 Brand Color만 주의 환기용으로 사용**합니다. (예: Slate/Navy 계열의 매우 짙은 어두운 톤)
- Background Primary/Secondary는 높은 명도 차별.
- Error / Success(Audit) 항목은 기능적 색상을 최소 채도로 허용.

## 2. Components (12개)
모든 온보딩 컴포넌트는 오직 '단일 진실 E2E' 통과를 목적에 두고 최소 변형으로 설계됩니다.
1. `Stepper`: 화면 상단에 진행 상황을 점 7개 혹은 프로그레스바로 표시(텍스트 생략하여 미니멀리즘 극대화).
2. `Primary Button`: 100% Full 너비 형태 권장, 로딩(`submitting` 상태) 시 텍스트 대신 중앙에 얇은 스피너 표기.
3. `Secondary Button`: 투명 배경 + 테두리. 로그아웃과 같은 부가 작업 용도.
4. `Form Input`: 라벨이 명확히 입력창 위에 정렬된 외곽선 스타일.
5. `Consent Item`: Checkbox + 약관 요약 텍스트 한 줄 + "전문 보기" 밑줄 모달 링크 형태.
6. `Document Viewer`: PDF/긴 스크롤 텍스트를 읽기 전용으로 가두는 Box 레이아웃 (배경 Secondary 색상 적용 권장).
7. `Signature`: 흰 바탕 + 1픽셀 두께의 서명 공간 (클리어 버튼 포함 구성).
8. `Toast/Alert`: 화면 상단 또는 하단에 표출되는 단일 행 얇은 바 (성공/에러 메시지 표출).
9. `Loading Skeleton`: Layout 진입 또는 API Wait 시 핵심 블록 스켈레톤 마스크 페이드 레이어.
10. `Empty State`: 아이콘 대신, 조용한 텍스트 위주의 중앙 정렬 안내 ("조회 기록이 없습니다").
11. `Result Card`: 결과 및 평가를 담는, 투박하지만 견고한 테두리를 가진 카드 컴포넌트.
12. `Audit Log Row`: 증적 로그 리스트. 해시값과 타임스탬프 필드에 한하여 정렬된 배열을 위해 가급적 **Monospace 타입 적용을 권장**합니다. 일반 텍스트는 Body 폰트 유지.
---END FILE---
