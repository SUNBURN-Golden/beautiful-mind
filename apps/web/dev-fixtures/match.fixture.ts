import type { MatchSurfaceItem } from '@/components/surfaces/match-surface';
import type { AppLocale } from '@/i18n/config';
import { getMatchCopy } from '@/i18n/match';

type MatchReadyFixture = {
    view: 'ready';
    loading: boolean;
    error: string | null;
    matches: MatchSurfaceItem[];
    connectionLabel: string;
};

export const matchStatusLoadingFixture = {
    view: 'status_loading',
} as const;

const matchFixtureStrings: Record<AppLocale, {
    nonActiveStage: string;
    readyError: string;
    items: MatchSurfaceItem[];
}> = {
    en: {
        nonActiveStage: 'ACCESS_REVIEW',
        readyError: 'The local fixture could not refresh the candidate feed.',
        items: [
            {
                id: 'fixture-match-1',
                name: 'Seoyun',
                trustSignal: 102,
                statusLabel: 'Conversation ready',
                tags: ['Identity verified', 'Consent current', 'Documents reviewed'],
                updatedLabel: 'Updated 8m ago',
            },
            {
                id: 'fixture-match-2',
                name: 'Minjun',
                trustSignal: 88,
                statusLabel: 'Extra review suggested',
                tags: ['Liveness verified', 'Trust history retained', 'Recent sync applied'],
                updatedLabel: 'Updated 2h ago',
            },
            {
                id: 'fixture-match-3',
                name: 'Harin',
                trustSignal: 74,
                statusLabel: 'Pending review',
                tags: ['Documents reviewed', 'Policy aligned', 'Calm exploration suggested'],
                updatedLabel: 'Updated 1d ago',
            },
        ],
    },
    ko: {
        nonActiveStage: '자격 심사 진행 중',
        readyError: '로컬 픽스처에서 후보 피드를 불러오지 못했습니다.',
        items: [
            {
                id: 'fixture-match-1',
                name: '서윤',
                trustSignal: 102,
                statusLabel: '대화 열기 가능',
                tags: ['신원 검증 완료', '동의 유지', '문서 검토 완료'],
                updatedLabel: '8분 전 갱신',
            },
            {
                id: 'fixture-match-2',
                name: '민준',
                trustSignal: 88,
                statusLabel: '추가 확인 권장',
                tags: ['라이브니스 확인 완료', '신뢰 이력 유지', '최근 동기화 반영'],
                updatedLabel: '2시간 전 갱신',
            },
            {
                id: 'fixture-match-3',
                name: '하린',
                trustSignal: 74,
                statusLabel: '검토 대기',
                tags: ['문서 검토 완료', '정책 일치 확인', '차분한 탐색 권장'],
                updatedLabel: '1일 전 갱신',
            },
        ],
    },
};

export function getMatchNonActiveFixture(locale: AppLocale) {
    return {
        view: 'non_active_gate' as const,
        currentStage: matchFixtureStrings[locale].nonActiveStage,
    };
}

export function getMatchReadyEmptyFixture(locale: AppLocale): MatchReadyFixture {
    const copy = getMatchCopy(locale);

    return {
        view: 'ready',
        loading: false,
        error: null,
        matches: [],
        connectionLabel: copy.connectionLabels.fixture,
    };
}

export function getMatchReadyErrorFixture(locale: AppLocale): MatchReadyFixture {
    const copy = getMatchCopy(locale);

    return {
        view: 'ready',
        loading: false,
        error: matchFixtureStrings[locale].readyError,
        matches: [],
        connectionLabel: copy.connectionLabels.fixture,
    };
}

export function getMatchReadyPopulatedFixture(locale: AppLocale): MatchReadyFixture {
    const copy = getMatchCopy(locale);

    return {
        view: 'ready',
        loading: false,
        error: null,
        connectionLabel: copy.connectionLabels.fixture,
        matches: matchFixtureStrings[locale].items,
    };
}
