'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    ActiveMetaRow,
    ActiveSectionPanel,
    ActiveSurfaceIntro,
    ActiveSurfaceShell,
    ActiveStatusChip,
    ActiveSupportText,
} from '@/components/active-patterns';
import { FlowInfoCard, FlowInfoGrid, ReferenceDetailsCard } from '@/components/screen-patterns';
import {
    FeedbackPanel,
    PageLoadingState,
    RecoverableErrorPanel,
    Skeleton,
    StageTransitionNotice,
} from '@/components/ui-kit';
import type { MatchCandidate } from '@/lib/active-contract';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { useMatchFeed } from './useMatchFeed';

function formatSignal(signal: number | null): string {
    if (signal === null) return 'Not available';
    return `${signal}`;
}

function signalSummary(signal: number | null): string {
    if (signal === null) return 'Signal pending';
    if (signal >= 100) return 'High-confidence signal';
    if (signal >= 80) return 'Solid signal';
    return 'Early signal';
}

function formatUpdatedAt(updatedAt: string | null): string {
    if (!updatedAt) return 'Timing unavailable';
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return 'Timing unavailable';

    const elapsedMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsedMs < hour) {
        const minutes = Math.max(1, Math.round(elapsedMs / minute));
        return `Updated ${minutes}m ago`;
    }
    if (elapsedMs < day) {
        const hours = Math.max(1, Math.round(elapsedMs / hour));
        return `Updated ${hours}h ago`;
    }
    const days = Math.max(1, Math.round(elapsedMs / day));
    return `Updated ${days}d ago`;
}

function topReasonLabel(index: number): string {
    if (index === 0) return 'Shown first in your current sync order';
    if (index < 3) return 'Shown early in your current sync order';
    return 'Included in your current sync order';
}

export default function MatchListPage() {
    const router = useRouter();
    const { stage, statusLoading, matches, loading, error, source, loadMatches } = useMatchFeed();

    if (statusLoading) {
        return (
            <PageLoadingState
                title="Preparing your match space"
                description="We are syncing ACTIVE access and candidate signals."
                lines={4}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="This area is available to ACTIVE members"
                description="Match discovery opens after admission approval and SOUL credential issuance."
            />
        );
    }

    const handleChat = (match: MatchCandidate) => {
        router.push(`/chat?matchId=${encodeURIComponent(match.id)}&partnerName=${encodeURIComponent(match.name)}`);
    };

    const sourceLabel = source === 'ADAPTER' ? 'Continuity mode' : 'Live sync';

    return (
        <ActiveSurfaceShell>
            <ActiveSectionPanel className="space-y-6">
                <ActiveSurfaceIntro
                    title="Verified Connection Feed"
                    description="A calm shortlist of verified candidates, presented in your latest sync order."
                    meta={<ActiveStatusChip>Connection • {sourceLabel}</ActiveStatusChip>}
                    note="Transparency note: ranking context in this view is limited to visible trust signal, status, and feed order returned by the current sync."
                />

                <FlowInfoGrid>
                    <FlowInfoCard
                        title="What to do now"
                        description="Review why a candidate appears in this sync snapshot, then open a conversation only when the trust context feels grounded."
                    />
                    <FlowInfoCard
                        title="How this feed behaves"
                        description="The ordering and reference block reflect the current sync snapshot. Candidate detail stays visible without overwhelming the decision."
                    />
                </FlowInfoGrid>
            </ActiveSectionPanel>

            <div className="space-y-7">
                {loading && (
                    <ActiveSectionPanel className="p-6">
                        <p className="mb-3 text-[13px] text-slate-600">Refreshing your candidate feed...</p>
                        <Skeleton lines={5} />
                    </ActiveSectionPanel>
                )}

                {error && (
                    <RecoverableErrorPanel
                        title="We couldn’t refresh your candidate feed"
                        message={error}
                        retryLabel="Refresh feed"
                        onRetry={() => void loadMatches()}
                        secondaryHref="/dashboard"
                        secondaryLabel="Back to Dashboard"
                    />
                )}

                {!loading && !error && matches.length === 0 && (
                    <FeedbackPanel
                        tone="info"
                        title="No candidates are visible yet"
                        description="As trust signals update, your feed will populate automatically. You can refresh now or check your admission and trust status."
                    >
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]" onClick={() => void loadMatches()}>
                                Refresh feed
                            </button>
                            <button type="button" className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]" onClick={() => router.push('/apply/status')}>
                                View Status
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
                                                {topReasonLabel(index)}
                                            </ActiveStatusChip>
                                        </ActiveMetaRow>
                                        <CardTitle className="text-[22px] font-semibold text-[#1d1d1f]">{match.name}</CardTitle>
                                        <CardDescription className="text-[14px]">
                                            {signalSummary(match.trustSignal)} · {formatUpdatedAt(match.updatedAt)}
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
                                    title="Why this appears now"
                                    rows={[
                                        { label: 'Summary', value: 'This placement reflects your current sync snapshot.' },
                                        { label: 'Trust Signal', value: <>{formatSignal(match.trustSignal)}</> },
                                        { label: 'Status', value: match.statusLabel },
                                        { label: 'Feed position', value: <>#{index + 1}</> },
                                    ]}
                                />
                                <div className="space-y-2">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Visible trust signals</p>
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
                                    <Button className="h-12 w-full" onClick={() => handleChat(match)}>
                                        Open Conversation
                                    </Button>
                                    <ActiveSupportText className="text-center">
                                        If anything feels off, you can file a report at any point in the conversation.
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
