import type { AppLocale } from './config';

const manualFixturesCopy = {
    en: {
        localeSwitch: {
            label: 'Language',
            english: 'English',
            korean: '한국어',
        },
        layout: {
            badge: 'Manual UI fixtures',
            title: 'Local fixed-render collection',
            description: 'These routes render the target surfaces with fixed local data only, without auth, hooks, API calls, or Supabase dependencies.',
            backToManual: 'Back to manual',
            viewIndex: 'View fixture index',
        },
        index: {
            title: 'Fixture route index',
            description: 'Each route renders one fixed state only. Upcoming visual review and safe UI work should anchor to these URLs.',
            groups: {
                landing: 'Landing',
                dashboard: 'Dashboard',
                match: 'Match',
            },
            routes: {
                landingDefault: 'Default state',
                dashboardLoading: 'Loading state',
                dashboardNonActive: 'Non-active gate',
                dashboardActive: 'Active state',
                matchStatusLoading: 'Status loading',
                matchNonActive: 'Non-active gate',
                matchReadyEmpty: 'Ready · empty',
                matchReadyError: 'Ready · error',
                matchReadyPopulated: 'Ready · populated',
            },
        },
        scene: {
            backToIndex: 'Fixture index',
        },
        pages: {
            landingDefault: {
                badge: 'Landing fixture',
                title: 'Landing · default',
                description: 'This renders the default unsigned landing state from fixed local inputs.',
            },
            dashboardLoading: {
                badge: 'Dashboard fixture',
                title: 'Dashboard · loading',
                description: 'This isolates the dashboard loading shell as a fixed render.',
                links: {
                    nonActive: 'View non-active gate',
                    active: 'View active state',
                },
            },
            dashboardNonActive: {
                badge: 'Dashboard fixture',
                title: 'Dashboard · non-active gate',
                description: 'This recreates the pre-ACTIVE dashboard gate with local fixed state only.',
                links: {
                    loading: 'View loading state',
                    active: 'View active state',
                },
            },
            dashboardActive: {
                badge: 'Dashboard fixture',
                title: 'Dashboard · active',
                description: 'This shows the ACTIVE dashboard with durable account detail and action panels from local fixtures.',
                links: {
                    loading: 'View loading state',
                    nonActive: 'View non-active gate',
                },
            },
            matchStatusLoading: {
                badge: 'Match fixture',
                title: 'Match · status loading',
                description: 'This isolates the loading shell before access and candidate sync finish.',
                links: {
                    nonActive: 'View non-active gate',
                    populated: 'View populated state',
                },
            },
            matchNonActive: {
                badge: 'Match fixture',
                title: 'Match · non-active gate',
                description: 'This recreates the gated match state before ACTIVE access opens.',
                links: {
                    loading: 'View status loading',
                    populated: 'View populated state',
                },
            },
            matchReadyEmpty: {
                badge: 'Match fixture',
                title: 'Match · ready empty',
                description: 'This shows the ready state after sync, but with no visible candidates.',
                links: {
                    error: 'View error state',
                    populated: 'View populated state',
                },
            },
            matchReadyError: {
                badge: 'Match fixture',
                title: 'Match · ready error',
                description: 'This recreates the recoverable refresh-error panel with local fixed data.',
                links: {
                    empty: 'View empty state',
                    populated: 'View populated state',
                },
            },
            matchReadyPopulated: {
                badge: 'Match fixture',
                title: 'Match · ready populated',
                description: 'This fills the shortlist so card hierarchy, chip density, and bilingual readability can be reviewed.',
                links: {
                    empty: 'View empty state',
                    error: 'View error state',
                },
            },
        },
    },
    ko: {
        localeSwitch: {
            label: '언어',
            english: 'English',
            korean: '한국어',
        },
        layout: {
            badge: '수동 화면 픽스처',
            title: '로컬 고정 렌더 모음',
            description: '이 경로들은 인증, 훅, API 호출, Supabase 의존 없이 고정된 로컬 데이터만으로 대상 화면을 렌더합니다.',
            backToManual: '수동 문서로 돌아가기',
            viewIndex: '픽스처 목록 보기',
        },
        index: {
            title: '픽스처 경로 목록',
            description: '각 경로는 하나의 고정 상태만 렌더합니다. 이후 시각 검토와 안전한 UI 작업은 이 주소들을 기준으로 진행합니다.',
            groups: {
                landing: '랜딩',
                dashboard: '대시보드',
                match: '매치',
            },
            routes: {
                landingDefault: '기본 상태',
                dashboardLoading: '로딩 상태',
                dashboardNonActive: '비활성 게이트 상태',
                dashboardActive: '활성 상태',
                matchStatusLoading: '상태 로딩',
                matchNonActive: '비활성 게이트 상태',
                matchReadyEmpty: '준비 완료 · 빈 목록',
                matchReadyError: '준비 완료 · 오류 상태',
                matchReadyPopulated: '준비 완료 · 목록 채움',
            },
        },
        scene: {
            backToIndex: '픽스처 목록',
        },
        pages: {
            landingDefault: {
                badge: '랜딩 픽스처',
                title: '랜딩 기본 상태',
                description: '로그인되지 않은 기본 진입 화면을 로컬 고정 입력만으로 렌더한 상태입니다.',
            },
            dashboardLoading: {
                badge: '대시보드 픽스처',
                title: '대시보드 로딩 상태',
                description: '대시보드 로딩 셸만 단독으로 확인할 수 있는 고정 렌더입니다.',
                links: {
                    nonActive: '비활성 게이트 보기',
                    active: '활성 상태 보기',
                },
            },
            dashboardNonActive: {
                badge: '대시보드 픽스처',
                title: '대시보드 비활성 게이트 상태',
                description: '활성 진입 전 단계 안내 화면을 로컬 고정 값으로 재현한 상태입니다.',
                links: {
                    loading: '로딩 상태 보기',
                    active: '활성 상태 보기',
                },
            },
            dashboardActive: {
                badge: '대시보드 픽스처',
                title: '대시보드 활성 상태',
                description: '문서 검증 참고 정보와 다음 액션 패널이 함께 보이는 활성 홈 상태입니다.',
                links: {
                    loading: '로딩 상태 보기',
                    nonActive: '비활성 게이트 보기',
                },
            },
            matchStatusLoading: {
                badge: '매치 픽스처',
                title: '매치 상태 로딩',
                description: '매치 접근 자격과 후보 동기화가 끝나기 전의 로딩 화면만 고정으로 렌더합니다.',
                links: {
                    nonActive: '비활성 게이트 보기',
                    populated: '후보 목록 보기',
                },
            },
            matchNonActive: {
                badge: '매치 픽스처',
                title: '매치 비활성 게이트 상태',
                description: '활성 이전 단계에서 매치 영역이 차단되는 안내 화면을 정적 데이터로 재현한 상태입니다.',
                links: {
                    loading: '상태 로딩 보기',
                    populated: '후보 목록 보기',
                },
            },
            matchReadyEmpty: {
                badge: '매치 픽스처',
                title: '매치 준비 완료 · 빈 목록',
                description: '동기화는 끝났지만 아직 표시할 후보가 없는 상태를 고정 데이터로 확인하는 경로입니다.',
                links: {
                    error: '오류 상태 보기',
                    populated: '후보 목록 보기',
                },
            },
            matchReadyError: {
                badge: '매치 픽스처',
                title: '매치 준비 완료 · 오류 상태',
                description: '후보 새로고침에 실패했을 때의 안내 패널을 로컬 오류 문구로 재현한 상태입니다.',
                links: {
                    empty: '빈 목록 보기',
                    populated: '후보 목록 보기',
                },
            },
            matchReadyPopulated: {
                badge: '매치 픽스처',
                title: '매치 준비 완료 · 목록 채움',
                description: '카드 계층과 태그 밀도를 확인할 수 있도록 후보를 채운 고정 렌더 상태입니다.',
                links: {
                    empty: '빈 목록 보기',
                    error: '오류 상태 보기',
                },
            },
        },
    },
} as const;

export function getManualFixturesCopy(locale: AppLocale) {
    return manualFixturesCopy[locale];
}
