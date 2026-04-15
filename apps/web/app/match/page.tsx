'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MatchSurface, type MatchSurfaceItem } from '@/components/surfaces/match-surface';
import type { MatchCandidate } from '@/lib/active-contract';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { LIVE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { formatMatchUpdatedLabel, getMatchCopy } from '@/i18n/match';
import { useAppLocale } from '@/i18n/use-app-locale';
import { useMatchFeed } from './useMatchFeed';

type MatchListPageContentProps = {
    locale: 'en' | 'ko';
};

function MatchListPageContent({ locale }: MatchListPageContentProps) {
    const router = useRouter();
    const copy = getMatchCopy(locale);
    const { stage, statusLoading, matches, loading, error, source, loadMatches } = useMatchFeed();

    if (statusLoading) {
        return <MatchSurface view="status_loading" locale={locale} />;
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return <MatchSurface view="non_active_gate" currentStage={stage} locale={locale} />;
    }

    const connectionLabel = source === 'ADAPTER' ? copy.connectionLabels.adapter : copy.connectionLabels.live;
    const uiMatches: MatchSurfaceItem[] = matches.map((match: MatchCandidate) => ({
        id: match.id,
        name: match.name,
        trustSignal: match.trustSignal,
        statusLabel: match.statusLabel,
        tags: match.tags,
        updatedLabel: formatMatchUpdatedLabel(locale, match.updatedAt),
    }));

    const handleChat = (match: MatchSurfaceItem) => {
        router.push(withLangQuery(`/chat?matchId=${encodeURIComponent(match.id)}&partnerName=${encodeURIComponent(match.name)}`, locale, LIVE_DEFAULT_LOCALE));
    };

    return (
        <MatchSurface
            view="ready"
            locale={locale}
            loading={loading}
            error={error}
            matches={uiMatches}
            connectionLabel={connectionLabel}
            onRetry={() => void loadMatches()}
            onViewStatus={() => router.push(withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE))}
            onOpenConversation={handleChat}
        />
    );
}

function MatchListPageResolved() {
    const locale = useAppLocale(LIVE_DEFAULT_LOCALE);
    return <MatchListPageContent locale={locale} />;
}

export default function MatchListPage() {
    return (
        <Suspense fallback={<MatchListPageContent locale={LIVE_DEFAULT_LOCALE} />}>
            <MatchListPageResolved />
        </Suspense>
    );
}
