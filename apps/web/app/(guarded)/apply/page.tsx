'use client';

import Link from 'next/link';
import {
    PageLoadingState,
    PrimaryButton,
    RecoverableErrorPanel,
    StageTransitionNotice,
    SuccessNextStepPanel,
    Toast,
} from '@/components/ui-kit';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowInset,
    FlowPageHeader,
    FlowPagePanel,
    FlowPageShell,
    PageActionRow,
} from '@/components/screen-patterns';
import { useApplyStart } from './useApplyStart';

export default function ApplyStartPage() {
    const { stage, isLoading, submitting, lastError, started, toast, handleStart } = useApplyStart();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your admission start"
                description="We’re checking your current stage and whether this entry step is available."
                lines={5}
            />
        );
    }

    if (stage && stage !== 'APPLY_START') {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to the right admission step"
                description="Your review is already in motion. We’ll open the screen that matches your current stage."
            />
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={0}
                    totalSteps={5}
                    eyebrow="Admission"
                    title="Start your admission review"
                    description={(
                        <>
                            We’ll guide you through identity, liveness, consent, documents, and automated review.
                            Start here, then follow the next step shown on each screen.
                        </>
                    )}
                />

                <FlowInfoGrid className="mt-6">
                    <FlowInfoCard
                        title="What happens now"
                        description="We create your admission record and unlock the identity step."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="You continue to identity verification and the rest of the review flow."
                    />
                </FlowInfoGrid>

                <FlowInset title="What we keep" className="mt-6">
                    <ul className="list-disc space-y-2 pl-5 text-[14px] text-slate-700">
                        <li>We do not ask for lifestyle or personality prompts that do not support review quality.</li>
                        <li>Original documents are purged after the final decision.</li>
                        <li>Only minimal verification claims and ledger events are retained.</li>
                    </ul>
                </FlowInset>

                {started && (
                    <div className="mt-6">
                        <SuccessNextStepPanel
                            title="Admission started"
                            description="Identity verification is next. If the handoff pauses, use the button below."
                            primaryHref="/apply/identity"
                            primaryLabel="Continue to identity"
                            secondaryHref="/apply/status"
                            secondaryLabel="View status"
                        />
                    </div>
                )}

                {lastError && (
                    <div className="mt-6">
                        <RecoverableErrorPanel
                            title="We couldn’t start your admission review"
                            message={lastError}
                            retryLabel="Start again"
                            onRetry={() => void handleStart()}
                            secondaryHref="/manual"
                            secondaryLabel="Open the guide"
                        />
                    </div>
                )}

                <PageActionRow className="mt-8">
                    <PrimaryButton type="button" onClick={handleStart} submitting={submitting}>
                        Start admission
                    </PrimaryButton>
                    <Link href="/apply/status" className="liquid-btn liquid-btn-secondary">
                        View current status
                    </Link>
                </PageActionRow>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
