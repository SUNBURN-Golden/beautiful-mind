'use client';

import Link from 'next/link';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import {
    PageLoadingState,
    PrimaryButton,
    RecoverableErrorPanel,
    StageTransitionNotice,
    Toast,
} from '@/components/ui-kit';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowPageHeader,
    FlowPagePanel,
    FlowPageShell,
    PageActionRow,
} from '@/components/screen-patterns';
import { ApplyReviewSignalsSection, ApplyReviewSuccessSection } from './review-sections';
import { useApplyReview } from './useApplyReview';

export default function ApplyReviewPage() {
    const {
        stage,
        isLoading,
        decision,
        reason,
        submitting,
        toast,
        lastError,
        decisionRequested,
        handleSubmit,
        retrySubmit,
    } = useApplyReview();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing the AI decision step"
                description="We’re syncing document-read completion and the current decision signals."
                lines={4}
            />
        );
    }

    if (stage && stage !== ADMISSION_STAGES.AI_DECISION) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to the AI decision step"
                description="Your source-of-truth stage points to a different screen, so we’re routing you there."
            />
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={5}
                    totalSteps={5}
                    title="AI decision"
                    description="The admission engine combines document extraction signals with policy rules to determine the next outcome."
                />

                <FlowInfoGrid className="mt-4">
                    <FlowInfoCard
                        title="What to do now"
                        description="Run the AI decision once the document step is complete, then confirm the final outcome on the status page."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="Most cases finish on the automated path. Only appeal, exception, and audit cases move into manual review."
                    />
                </FlowInfoGrid>

                <ApplyReviewSignalsSection decision={decision} reason={reason} />

                {decisionRequested && (
                    <div className="mt-6">
                        <ApplyReviewSuccessSection />
                    </div>
                )}

                {lastError && (
                    <div className="mt-6">
                        <RecoverableErrorPanel
                            title="We couldn’t run the AI decision"
                            message={lastError}
                            retryLabel="Run again"
                            onRetry={retrySubmit}
                            secondaryHref="/apply/status"
                            secondaryLabel="Open status"
                        />
                    </div>
                )}

                <PageActionRow className="mt-8">
                    <PrimaryButton type="button" onClick={handleSubmit} submitting={submitting}>
                        Run AI decision
                    </PrimaryButton>
                    <Link href="/apply/status" className="liquid-btn liquid-btn-secondary">
                        Open status
                    </Link>
                </PageActionRow>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
