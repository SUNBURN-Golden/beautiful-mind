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
        <ActiveSurfaceShell>
            <ActiveSectionPanel className="space-y-6">
                <ActiveSurfaceIntro
                    title={copy.intro.title}
                    description={copy.intro.description}
                    meta={<ActiveStatusChip>{copy.intro.metaPrefix} • {connectionLabel}</ActiveStatusChip>}
                    note={copy.intro.note}
                />

                <FlowInfoGrid>
                    <FlowInfoCard
                        title={copy.infoCards.whatNowTitle}
                        description={copy.infoCards.whatNowDescription}
                    />
                    <FlowInfoCard
                        title={copy.infoCards.behaviorTitle}
                        description={copy.infoCards.behaviorDescription}
                    />
                </FlowInfoGrid>
            </ActiveSectionPanel>

            <div className="space-y-7">
                {loading && (
                    <ActiveSectionPanel className="p-6">
                        <p className="mb-3 text-[13px] text-slate-600">{copy.refresh.loading}</p>
                        <Skeleton lines={5} />
                    </ActiveSectionPanel>
                )}

                {error && (
                    <RecoverableErrorPanel
                        title={copy.error.title}
                        message={error}
                        retryLabel={copy.refresh.retry}
                        onRetry={onRetry}
                        secondaryHref={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}
                        secondaryLabel={copy.error.secondaryLabel}
                    />
                )}

                {!loading && !error && matches.length === 0 && (
                    <FeedbackPanel
                        tone="info"
                        title={copy.empty.title}
                        description={copy.empty.description}
                    >
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]" onClick={onRetry}>
                                {copy.refresh.retry}
                            </button>
                            <button type="button" className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]" onClick={onViewStatus}>
                                {copy.refresh.viewStatus}
                            </button>
                        </div>
                    </FeedbackPanel>
                )}

                <div className="flex flex-col gap-4">
                    {matches.map((match, index) => (
                        <Card key={match.id} className="liquid-pane liquid-rise w-full rounded-3xl border-[#e5e5e7]">
                            <CardHeader className="pb-2">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <ActiveMetaRow>
                                            <ActiveStatusChip tone="neutral" className="px-2.5 py-1 font-semibold">
                                                {topReasonLabel(index, copy)}
                                            </ActiveStatusChip>
                                        </ActiveMetaRow>
                                        <CardTitle className="text-[22px] font-semibold text-[#1d1d1f]">{match.name}</CardTitle>
                                        <CardDescription className="text-[14px]">
                                            {signalSummary(match.trustSignal, copy)} · {match.updatedLabel}
                                        </CardDescription>
                                    </div>
                                    <ActiveStatusChip
                                        tone={match.trustSignal !== null && match.trustSignal >= 100 ? 'success' : 'warning'}
                                        className="text-[12px]"
                                    >
                                        {match.statusLabel}
                                    </ActiveStatusChip>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3.5">
                                <ReferenceDetailsCard
                                    title={copy.labels.referenceTitle}
                                    rows={[
                                        { label: copy.labels.summaryLabel, value: copy.labels.summaryValue },
                                        { label: copy.labels.trustSignal, value: <>{formatSignal(match.trustSignal, copy.labels.signalUnavailable)}</> },
                                        { label: copy.labels.status, value: match.statusLabel },
                                        { label: copy.labels.feedPosition, value: <>#{index + 1}</> },
                                    ]}
                                />
                                <div className="space-y-2">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{copy.labels.visibleSignals}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {match.tags.map((tag) => (
                                            <ActiveStatusChip key={tag} tone="neutral" className="border-[#d7dce5] bg-white px-2.5 py-1 font-medium text-[#5f6774]">
                                                {tag}
                                            </ActiveStatusChip>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="rounded-b-3xl border-t border-[#ececf0] bg-[#fbfbfd] pt-4">
                                <div className="w-full space-y-2">
                                    <Button className="h-12 w-full" onClick={() => onOpenConversation(match)}>
                                        {copy.labels.openConversation}
                                    </Button>
                                    <ActiveSupportText className="text-center">
                                        {copy.labels.supportNote}
                                    </ActiveSupportText>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </ActiveSurfaceShell>
    );
}
