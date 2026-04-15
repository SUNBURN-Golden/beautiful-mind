import type { AppLocale } from './config';

const matchCopy = {
    en: {
        loading: {
            title: 'Preparing your match space',
            description: 'We are syncing ACTIVE access and candidate signals.',
        },
        gate: {
            title: 'This area is available to ACTIVE members',
            description: 'Match discovery opens after admission approval and SOUL credential issuance.',
            primaryLabel: 'Go to current step',
            secondaryLabel: 'Open the guide',
        },
        intro: {
            title: 'Verified Connection Feed',
            description: 'A calm shortlist of verified candidates, presented in your latest sync order.',
            metaPrefix: 'Connection',
            note: 'Transparency note: ranking context in this view is limited to visible trust signal, status, and feed order returned by the current sync.',
        },
        infoCards: {
            whatNowTitle: 'What to do now',
            whatNowDescription: 'Review why a candidate appears in this sync snapshot, then open a conversation only when the trust context feels grounded.',
            behaviorTitle: 'How this feed behaves',
            behaviorDescription: 'The ordering and reference block reflect the current sync snapshot. Candidate detail stays visible without overwhelming the decision.',
        },
        refresh: {
            loading: 'Refreshing your candidate feed...',
            retry: 'Refresh feed',
            viewStatus: 'View Status',
        },
        error: {
            title: 'We couldn’t refresh your candidate feed',
            secondaryLabel: 'Back to Dashboard',
        },
        empty: {
            title: 'No candidates are visible yet',
            description: 'As trust signals update, your feed will populate automatically. You can refresh now or check your admission and trust status.',
        },
        reasonLabels: {
            first: 'Shown first in your current sync order',
            early: 'Shown early in your current sync order',
            included: 'Included in your current sync order',
        },
        signalSummary: {
            pending: 'Signal pending',
            high: 'High-confidence signal',
            solid: 'Solid signal',
            early: 'Early signal',
        },
        connectionLabels: {
            adapter: 'Continuity mode',
            live: 'Live sync',
            fixture: 'Local fixed feed',
        },
        labels: {
            timingUnavailable: 'Timing unavailable',
            signalUnavailable: 'Not available',
            referenceTitle: 'Why this appears now',
            summaryLabel: 'Summary',
            summaryValue: 'This placement reflects your current sync snapshot.',
            trustSignal: 'Trust Signal',
            status: 'Status',
            feedPosition: 'Feed position',
            visibleSignals: 'Visible trust signals',
            openConversation: 'Open Conversation',
            supportNote: 'If anything feels off, you can file a report at any point in the conversation.',
        },
        updatedTemplates: {
            minutes: 'Updated {count}m ago',
            hours: 'Updated {count}h ago',
            days: 'Updated {count}d ago',
        },
    },
    ko: {
        loading: {
            title: '매치 공간을 준비하는 중입니다',
            description: '활성 접근과 후보 신호를 동기화하고 있습니다.',
        },
        gate: {
            title: '이 영역은 활성 멤버에게 열립니다',
            description: '심사 승인과 SOUL 크리덴셜 발급 이후에만 매치 탐색이 열립니다.',
            primaryLabel: '현재 단계로 이동',
            secondaryLabel: '가이드 열기',
        },
        intro: {
            title: '검증된 연결 피드',
            description: '현재 동기화 순서를 기준으로 차분하게 정리한 검증 후보 목록입니다.',
            metaPrefix: '연결',
            note: '투명성 안내: 이 화면의 정렬 맥락은 현재 동기화에서 반환된 신뢰 신호, 상태, 피드 순서까지만 보여줍니다.',
        },
        infoCards: {
            whatNowTitle: '지금 확인할 일',
            whatNowDescription: '왜 이 후보가 현재 스냅샷에 나타나는지 먼저 확인한 뒤, 신뢰 맥락이 충분히 납득될 때만 대화를 여세요.',
            behaviorTitle: '이 피드가 보이는 방식',
            behaviorDescription: '정렬과 참고 블록은 현재 동기화 스냅샷을 그대로 반영합니다. 후보 상세는 의사결정을 흐리지 않도록 차분하게 유지됩니다.',
        },
        refresh: {
            loading: '후보 피드를 새로고침하는 중입니다...',
            retry: '피드 새로고침',
            viewStatus: '상태 보기',
        },
        error: {
            title: '후보 피드를 새로고침하지 못했습니다',
            secondaryLabel: '대시보드로 돌아가기',
        },
        empty: {
            title: '아직 표시할 후보가 없습니다',
            description: '신뢰 신호가 업데이트되면 피드가 자동으로 채워집니다. 지금 새로고침하거나 심사 및 신뢰 상태를 확인할 수 있습니다.',
        },
        reasonLabels: {
            first: '현재 동기화 순서에서 가장 먼저 보입니다',
            early: '현재 동기화 순서의 앞부분에 배치되었습니다',
            included: '현재 동기화 순서에 포함되었습니다',
        },
        signalSummary: {
            pending: '신호 확인 대기',
            high: '높은 신뢰 신호',
            solid: '안정적인 신뢰 신호',
            early: '초기 신호 단계',
        },
        connectionLabels: {
            adapter: '연속성 모드',
            live: '실시간 동기화',
            fixture: '로컬 고정 피드',
        },
        labels: {
            timingUnavailable: '시간 정보 없음',
            signalUnavailable: '정보 없음',
            referenceTitle: '지금 이 후보가 보이는 이유',
            summaryLabel: '요약',
            summaryValue: '이 배치는 현재 동기화 스냅샷을 반영합니다.',
            trustSignal: '신뢰 신호',
            status: '상태',
            feedPosition: '피드 순서',
            visibleSignals: '표시 가능한 신뢰 신호',
            openConversation: '대화 열기',
            supportNote: '이상하게 느껴지는 점이 있다면 대화 중 언제든 신고할 수 있습니다.',
        },
        updatedTemplates: {
            minutes: '{count}분 전 갱신',
            hours: '{count}시간 전 갱신',
            days: '{count}일 전 갱신',
        },
    },
} as const;

function interpolate(template: string, count: number): string {
    return template.replace('{count}', String(count));
}

export function getMatchCopy(locale: AppLocale) {
    return matchCopy[locale];
}

export function formatMatchUpdatedLabel(
    locale: AppLocale,
    updatedAt: string | null,
    now: number = Date.now(),
): string {
    const copy = getMatchCopy(locale);
    if (!updatedAt) return copy.labels.timingUnavailable;

    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return copy.labels.timingUnavailable;

    const elapsedMs = now - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsedMs < hour) {
        const minutes = Math.max(1, Math.round(elapsedMs / minute));
        return interpolate(copy.updatedTemplates.minutes, minutes);
    }
    if (elapsedMs < day) {
        const hours = Math.max(1, Math.round(elapsedMs / hour));
        return interpolate(copy.updatedTemplates.hours, hours);
    }

    const days = Math.max(1, Math.round(elapsedMs / day));
    return interpolate(copy.updatedTemplates.days, days);
}
