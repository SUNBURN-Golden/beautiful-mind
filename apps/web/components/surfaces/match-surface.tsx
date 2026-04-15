'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ActiveMetaRow,
    ActiveSectionPanel,
    ActiveStatusChip,
    ActiveSupportText,
    ActiveSurfaceIntro,
    ActiveSurfaceShell,
} from '@/components/active-patterns';
import { FlowInfoCard, FlowInfoGrid, ReferenceDetailsCard } from '@/components/screen-patterns';
import {
    FeedbackPanel,
    PageLoadingState,
    RecoverableErrorPanel,
    Skeleton,
    StageTransitionNotice,
} from '@/components/ui-kit';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getMatchCopy } from '@/i18n/match';

function formatSignal(signal: number | null, unavailableLabel: string): string {
    if (signal === null) return unavailableLabel;
    return `${signal}`;
}

function signalSummary(signal: number | null, copy: ReturnType<typeof getMatchCopy>): string {
    if (signal === null) return copy.signalSummary.pending;
    if (signal >= 100) return copy.signalSummary.high;
    if (signal >= 80) return copy.signalSummary.solid;
    return copy.signalSummary.early;
}

function topReasonLabel(index: number, copy: ReturnType<typeof getMatchCopy>): string {
    if (index === 0) return copy.reasonLabels.first;
    if (index < 3) return copy.reasonLabels.early;
    return copy.reasonLabels.included;
}

type MatchSurfaceStatusLoadingProps = {
    view: 'status_loading';
    locale?: AppLocale;
};

type MatchSurfaceNonActiveGateProps = {
    view: 'non_active_gate';
    currentStage?: string;
    locale?: AppLocale;
};

export type MatchSurfaceItem = {
    id: string;
    name: string;
    trustSignal: number | null;
    statusLabel: string;
    tags: string[];
    updatedLabel: string;
};

type MatchSurfaceReadyProps = {
    view: 'ready';
    locale?: AppLocale;
    loading: boolean;
    error: string | null;
    matches: MatchSurfaceItem[];
    connectionLabel: string;
    onRetry: () => void;
    onViewStatus: () => void;
    onOpenConversation: (match: MatchSurfaceItem) => void;
};

export type MatchSurfaceProps =
    | MatchSurfaceStatusLoadingProps
    | MatchSurfaceNonActiveGateProps
    | MatchSurfaceReadyProps;

export function MatchSurface(props: MatchSurfaceProps) {
    const locale = props.locale ?? LIVE_DEFAULT_LOCALE;
    const copy = getMatchCopy(locale);

    if (props.view === 'status_loading') {
        return (
            <PageLoadingState
                title={copy.loading.title}
                description={copy.loading.description}
                lines={4}
            />
        );
    }

    if (props.view === 'non_active_gate') {
        return (
            <StageTransitionNotice
                currentStep={props.currentStage}
                title={copy.gate.title}
                description={copy.gate.description}
                primaryLabel={copy.gate.primaryLabel}
                secondaryLabel={copy.gate.secondaryLabel}
            />
        );
    }

    const { loading, error, matches, connectionLabel, onRetry, onViewStatus, onOpenConversation } = props;

    return (
        <div className={`sb-locale-${locale}`} lang={locale}>
            <ActiveSurfaceShell className="sb-stage-shell sb-match-stage">
                <ActiveSectionPanel className="sb-surface-panel sb-match-hero space-y-6">
                    <ActiveSurfaceIntro
                        title={copy.intro.title}
                        description={copy.intro.description}
                        meta={<ActiveStatusChip>{copy.intro.metaPrefix} • {connectionLabel}</ActiveStatusChip>}
                        note={copy.intro.note}
                    />

                    <FlowInfoGrid>
                        <FlowInfoCard
                            className="sb-surface-subpanel sb-match-info-card"
                            title={copy.infoCards.whatNowTitle}
                            description={copy.infoCards.whatNowDescription}
                        />
                        <FlowInfoCard
                            className="sb-surface-subpanel sb-match-info-card"
                            title={copy.infoCards.behaviorTitle}
                            description={copy.infoCards.behaviorDescription}
                        />
                    </FlowInfoGrid>
                </ActiveSectionPanel>

                <div className="sb-match-feed space-y-7">
                    {loading && (
                        <ActiveSectionPanel className="sb-surface-panel sb-match-loading-panel p-6">
                            <p className="sb-match-loading-copy mb-3 text-[13px]">{copy.refresh.loading}</p>
                            <Skeleton lines={5} />
                        </ActiveSectionPanel>
                    )}

                    {error && (
                        <div className="sb-match-message-panel">
                            <RecoverableErrorPanel
                                title={copy.error.title}
                                message={error}
                                retryLabel={copy.refresh.retry}
                                onRetry={onRetry}
                                secondaryHref={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}
                                secondaryLabel={copy.error.secondaryLabel}
                            />
                        </div>
                    )}

                    {!loading && !error && matches.length === 0 && (
                        <div className="sb-match-message-panel">
                            <FeedbackPanel
                                tone="info"
                                title={copy.empty.title}
                                description={copy.empty.description}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className="liquid-btn liquid-btn-secondary sb-pill-action sb-pill-action-inline sb-pill-action-soft !px-3 !py-1.5 text-[12px]" onClick={onRetry}>
                                        {copy.refresh.retry}
                                    </button>
                                    <button type="button" className="liquid-btn liquid-btn-secondary sb-pill-action sb-pill-action-inline sb-pill-action-soft !px-3 !py-1.5 text-[12px]" onClick={onViewStatus}>
                                        {copy.refresh.viewStatus}
                                    </button>
                                </div>
                            </FeedbackPanel>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        {matches.map((match, index) => (
                            <Card key={match.id} className="liquid-pane liquid-rise sb-surface-panel sb-match-card w-full rounded-3xl">
                                <CardHeader className="pb-2">
                                    <div className="sb-match-card-head flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="sb-match-card-heading space-y-1.5">
                                            <ActiveMetaRow>
                                                <ActiveStatusChip tone="neutral" className="sb-match-reason-chip px-2.5 py-1 font-semibold">
                                                    {topReasonLabel(index, copy)}
                                                </ActiveStatusChip>
                                            </ActiveMetaRow>
                                            <CardTitle className="sb-match-card-title text-[22px] font-semibold">{match.name}</CardTitle>
                                            <CardDescription className="sb-match-card-meta text-[14px]">
                                                {signalSummary(match.trustSignal, copy)} · {match.updatedLabel}
                                            </CardDescription>
                                        </div>
                                        <ActiveStatusChip
                                            tone={match.trustSignal !== null && match.trustSignal >= 100 ? 'success' : 'warning'}
                                            className="sb-match-status-chip text-[12px]"
                                        >
                                            {match.statusLabel}
                                        </ActiveStatusChip>
                                    </div>
                                </CardHeader>
                                <CardContent className="sb-match-card-content space-y-3.5">
                                    <ReferenceDetailsCard
                                        className="sb-surface-reference sb-match-reference-card"
                                        title={copy.labels.referenceTitle}
                                        rows={[
                                            { label: copy.labels.summaryLabel, value: copy.labels.summaryValue },
                                            { label: copy.labels.trustSignal, value: <>{formatSignal(match.trustSignal, copy.labels.signalUnavailable)}</> },
                                            { label: copy.labels.status, value: match.statusLabel },
                                            { label: copy.labels.feedPosition, value: <>#{index + 1}</> },
                                        ]}
                                    />
                                    <div className="sb-match-signal-group space-y-2.5">
                                        <p className="sb-match-signal-label text-[10px] font-medium uppercase tracking-[0.08em]">{copy.labels.visibleSignals}</p>
                                        <div className="sb-match-tag-row flex flex-wrap gap-2">
                                            {match.tags.map((tag) => (
                                                <ActiveStatusChip key={tag} tone="neutral" className="sb-match-tag px-2.5 py-1 font-medium">
                                                    {tag}
                                                </ActiveStatusChip>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="sb-match-card-footer rounded-b-3xl pt-4">
                                    <div className="w-full space-y-2">
                                        <Button className="sb-pill-action sb-pill-action-block sb-pill-action-dark sb-match-cta h-12 w-full" onClick={() => onOpenConversation(match)}>
                                            {copy.labels.openConversation}
                                        </Button>
                                        <ActiveSupportText className="sb-match-support text-center">
                                            {copy.labels.supportNote}
                                        </ActiveSupportText>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </ActiveSurfaceShell>
        </div>
    );
}
