'use client';

import Link from 'next/link';
import {
    FeedbackPanel,
    PageLoadingState,
    RecoverableErrorPanel,
    StageTransitionNotice,
    SuccessNextStepPanel,
} from '@/components/ui-kit';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowInset,
    FlowPageHeader,
    FlowPagePanel,
    FlowPageShell,
    PageActionRow,
    ReferenceDetailsCard,
} from '@/components/screen-patterns';
import { useApplyStatusView } from './useApplyStatusView';

export default function ApplyStatusPage() {
    const {
        isLoading,
        isRefreshing,
        refetch,
        stage,
        statusError,
        statusErrorCopy,
        isStageSupported,
        reviewState,
        reviewQueueType,
        admissionStatus,
        soulIssued,
        decisionFinal,
        decisionReasonCode,
        decisionReason,
        decisionConfidence,
        appealStatus,
        exceptionStatus,
        isActive,
        lastSynced,
        stageCopy,
        recommendedActions,
        blockerGuidance,
        missingDocs,
        missingConsents,
        missingDocLabels,
        missingConsentLabels,
    } = useApplyStatusView();

    const hasMissingRequirements = missingDocs.length > 0 || missingConsents.length > 0;
    const hasRecommendedActions = recommendedActions.length > 0;

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your admission status"
                description="We’re syncing your current stage, blockers, and next best action."
                lines={4}
            />
        );
    }

    if (!stage && statusError) {
        return (
            <FlowPageShell maxWidth="max-w-4xl">
                <FlowPagePanel>
                    <RecoverableErrorPanel
                        title={statusErrorCopy.title}
                        message={`${statusErrorCopy.message} (${statusError})`}
                        retryLabel="Refresh status"
                        onRetry={() => void refetch()}
                        secondaryHref="/apply"
                        secondaryLabel="Back to admission home"
                    />
                </FlowPagePanel>
            </FlowPageShell>
        );
    }

    if (!stage || !isStageSupported || !stageCopy) {
        return (
            <StageTransitionNotice
                currentStep={stage || undefined}
                title="We’re syncing your admission route"
                description="We’ll take you to the screen that matches your current status."
            />
        );
    }

    return (
        <FlowPageShell maxWidth="max-w-4xl">
            <FlowPagePanel>
                <FlowPageHeader
                    step={stageCopy.progressStep}
                    totalSteps={5}
                    title="Admission status"
                    description={(
                        <>
                            <strong>{stageCopy.label}</strong>
                            <span className="block pt-1 text-[14px] font-normal text-slate-600">Standards come first. Start with what you should do now, then use the reference detail only if you need it.</span>
                        </>
                    )}
                />

                {isActive ? (
                    <div className="mt-6">
                        <SuccessNextStepPanel
                            title="ACTIVE access is ready"
                            description="Your dashboard and the full ACTIVE surface are now available."
                            primaryHref="/dashboard"
                            primaryLabel="Open dashboard"
                            secondaryHref="/match"
                            secondaryLabel="View matches"
                        />
                    </div>
                ) : (
                    <div className="mt-6">
                        <FeedbackPanel
                            tone={hasRecommendedActions || hasMissingRequirements ? 'warning' : 'info'}
                            title={hasRecommendedActions || hasMissingRequirements ? 'What to do now' : 'Your review is still in motion'}
                            description={
                                hasRecommendedActions || hasMissingRequirements
                                    ? 'Complete the next action below to keep your review moving.'
                                    : 'Once this stage finishes, the next screen opens automatically. We keep syncing in the background.'
                            }
                        >
                            <div className="space-y-3">
                                <FlowInfoCard
                                    title={<span className="text-[12px] uppercase tracking-wide text-slate-500">Current stage</span>}
                                    description={(
                                        <>
                                            <p className="mt-1 text-[15px] font-medium text-slate-900">{stageCopy.label}</p>
                                            <p className="mt-1 text-[12px] text-slate-600">{stageCopy.description}</p>
                                        </>
                                    )}
                                />

                                {hasMissingRequirements && (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                                        {missingDocs.length > 0 && <p>Missing documents: {missingDocLabels.join(', ')}</p>}
                                        {missingConsents.length > 0 && <p className="mt-1">Missing consents: {missingConsentLabels.join(', ')}</p>}
                                    </div>
                                )}

                                <PageActionRow className="gap-2">
                                    {hasRecommendedActions ? (
                                        recommendedActions.map((action) => (
                                            <Link key={action.href} href={action.href} className="liquid-btn liquid-btn-primary">
                                                {action.label}
                                            </Link>
                                        ))
                                    ) : (
                                        <button type="button" className="liquid-btn liquid-btn-secondary" onClick={() => void refetch()}>
                                            Refresh status
                                        </button>
                                    )}
                                </PageActionRow>
                            </div>
                        </FeedbackPanel>
                    </div>
                )}

                <FlowInset className="mt-4 flex flex-wrap items-center gap-3 px-4 py-3 text-[12px] text-slate-600">
                    <span>Last synced: {lastSynced}</span>
                    <span>{isRefreshing ? 'Syncing now...' : 'Auto-sync standing by'}</span>
                    <button type="button" className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]" onClick={() => void refetch()}>
                        Refresh now
                    </button>
                </FlowInset>

                {blockerGuidance.length > 0 && (
                    <FlowInset title="Why this step is paused" className="mt-6 border-[#e5e5e7] bg-white">
                        <ul className="space-y-2 text-[13px] text-slate-700">
                            {blockerGuidance.map(({ code, copy }) => (
                                <li key={code}>
                                    <p className="font-medium text-slate-900">{copy.title}</p>
                                    <p className="text-slate-600">{copy.description}</p>
                                    <p className="text-[11px] text-slate-500">Reference code: {code}</p>
                                </li>
                            ))}
                        </ul>
                    </FlowInset>
                )}

                <FlowInset title="Reference detail" className="mt-6">
                    <FlowInfoGrid>
                        <ReferenceDetailsCard
                            title="Decision summary"
                            rows={[
                                { label: 'Outcome', value: decisionFinal },
                                { label: 'Reason', value: decisionReason },
                                { label: 'Confidence', value: decisionConfidence },
                            ]}
                            className="h-full"
                        />
                        <ReferenceDetailsCard
                            title="Operational reference"
                            rows={[
                                { label: 'Review queue', value: `${reviewQueueType} / ${reviewState}` },
                                { label: 'Reason code', value: decisionReasonCode || 'Not available' },
                                { label: 'Appeal', value: appealStatus },
                                { label: 'Exception', value: exceptionStatus },
                                { label: 'SOUL', value: soulIssued ? 'Issued' : 'Not issued' },
                            ]}
                            className="h-full"
                        />
                    </FlowInfoGrid>

                    <FlowInfoGrid className="mt-3">
                        <ReferenceDetailsCard
                            title="Stage reference"
                            rows={[
                                { label: 'Stage', value: stage },
                                { label: 'Admission status', value: admissionStatus },
                            ]}
                            className="h-full"
                        />
                    </FlowInfoGrid>
                </FlowInset>

                <PageActionRow className="mt-8">
                    <Link href="/apply/documents" className="liquid-btn liquid-btn-secondary">
                        Back to documents
                    </Link>
                    {(stage === 'REJECTED' || stage === 'RESUBMIT_REQUIRED' || stage === 'EXCEPTION_REVIEW') && (
                        <Link href="/apply/appeal" className="liquid-btn liquid-btn-secondary">
                            Start an appeal
                        </Link>
                    )}
                    {isActive ? (
                        <Link href="/dashboard" className="liquid-btn liquid-btn-primary">
                            Open ACTIVE dashboard
                        </Link>
                    ) : (
                        <Link href="/apply" className="liquid-btn liquid-btn-primary">
                            Continue admission
                        </Link>
                    )}
                </PageActionRow>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
