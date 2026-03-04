# Beautiful Mind MVP

Beautiful Mind는 신뢰할 수 있는 사용자 간의 명시적 동의와 검증 기반 보안 플랫폼입니다. 이 리포지토리는 Monorepo 구조로 설계되었으며, 독립적인 UI 앱과 순수 논리 인터페이스(Core)를 포함합니다.

## 시스템 아키텍처 (Tech Stack)
- **런타임 & 모노레포**: Node.js, pnpm workspaces
- **프론트엔드**: Next.js (App Router), Tailwind CSS v4, shadcn/ui
- **코어 패키지 (Logic/Rules)**: TypeScript (Pure Functions isolated in `packages/core`)
- **데이터베이스/Auth**: Supabase (PostgreSQL), RLS (Row Level Security) 강제 적용

## 디렉토리 구조
- `apps/web/`: 메인 프론트엔드 Next.js 애플리케이션
- `packages/core/`: 코어 로직 패키지 (상태 판별 로직, 법률 텍스트 바인딩 등)
- `docs/legal/`: 유저에게 렌더링될 실제 법무 약관 마크다운 파일 공간 (수정 절대 불가 원칙)

## 로컬 실행 방법
이 프로젝트는 pnpm 기반으로 구성되어 있습니다. 로컬 환경에서 실행하려면 다음과 같이 설정합니다.

### 1. 패키지 설치
최상위 경로에서 의존성을 설치합니다.
```bash
pnpm install
```

### 2. 개발 서버 시작
다음 명령어로 Next.js 웹앱을 로컬 리눅스 터미널에서 구동합니다.
```bash
pnpm dev
```
또는 `apps/web` 으로 이동하여 구동할 수도 있습니다.
`http://localhost:3000` 에서 프로젝트를 확인할 수 있습니다.

### 핵심 설계 규칙 (Agent Rules)
1. **Legal Texts**: 법무 문구(`docs/legal/terms.md`, `privacy.md`)는 오직 읽기 전용으로만 접근되어야 합니다. 수정은 금지되며, 동의 모듈에서 원본 그대로 렌더링됩니다.
2. **Core Isolation**: 상태 판별, 패널티 부과, 자격 점수 도출 등 핵심 로직은 반드시 `packages/core/status.ts` 등에서 관리되며 서버사이드(Server Actions/API)에서만 실행됩니다.
