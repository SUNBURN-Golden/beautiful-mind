'use client';

import Link from 'next/link';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
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
import { AppealFormSection, AppealStatusSection } from './appeal-sections';
import { APPEAL_REASON_OPTIONS, useApplyAppeal } from './useApplyAppeal';

const APPEAL_ELIGIBLE_STAGES: ReadonlySet<string> = new Set([
    ADMISSION_STAGES.REJECTED,
    ADMISSION_STAGES.RESUBMIT_REQUIRED,
    ADMISSION_STAGES.EXCEPTION_REVIEW,
    ADMISSION_STAGES.APPEAL_PENDING,
]);

export default function ApplyAppealPage() {
    const {
        stage,
        isLoading,
        reasonCode,
        statement,
        evidenceRef,
        submitting,
        checking,
        existingAppeal,
        statusLoadError,
        submitDone,
        toast,
        canSubmit,
        setReasonCode,
        setStatement,
        setEvidenceRef,
        retryLoadAppealStatus,
        handleSubmit,
    } = useApplyAppeal();

    if (isLoading) {
        return <PageLoadingState title="Preparing your appeal" description="We’re confirming your current stage and appeal eligibility." lines={4} />;
    }

    if (stage && !APPEAL_ELIGIBLE_STAGES.has(stage)) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to the right appeal step"
                description="Appeals only open on the stages that support manual review or decision recovery."
            />
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    title="Appeal a decision"
                    description="Use this screen only when you need a human review of a rejection, a resubmission decision, or an exception outcome."
                />

                <FlowInfoGrid className="mt-4">
                    <FlowInfoCard
                        title="What to do now"
                        description="Choose the closest appeal reason, explain what was wrong, and include any evidence reference that helps a reviewer verify your claim."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="Once submitted, your case moves onto the cold path for manual review. Status updates continue on the admission status page."
                    />
                </FlowInfoGrid>

                <FlowInset title="How to write a strong appeal" className="mt-4">
                    Focus on verifiable facts, missing context, or a concrete document-reading issue. Keep policy interpretation secondary to the evidence you want reviewed.
                </FlowInset>

                {checking && (
                    <FlowInset title="Checking your current appeal status" className="mt-4">
                        We’re confirming whether an open appeal already exists before we accept a new request.
                    </FlowInset>
                )}

                {statusLoadError && (
                    <div className="mt-4">
                        <RecoverableErrorPanel
                            title="We couldn’t load your current appeal status"
                            message={statusLoadError}
                            retryLabel="Retry check"
                            onRetry={retryLoadAppealStatus}
                        />
                    </div>
                )}

                <AppealStatusSection existingAppeal={existingAppeal} />

                {submitDone && (
                    <div className="mt-4">
                        <SuccessNextStepPanel
                            title="Your appeal is in review"
                            description="We’ll keep the cold-path review visible from your admission status page."
                            primaryHref="/apply/status"
                            primaryLabel="Open status"
                            secondaryHref="/manual"
                            secondaryLabel="Open the guide"
                        />
                    </div>
                )}

                <form className="mt-6" onSubmit={handleSubmit}>
                    <AppealFormSection
                        reasonCode={reasonCode}
                        statement={statement}
                        evidenceRef={evidenceRef}
                        submitting={submitting}
                        onReasonCodeChange={setReasonCode}
                        onStatementChange={setStatement}
                        onEvidenceRefChange={setEvidenceRef}
                        reasonOptions={APPEAL_REASON_OPTIONS}
                    />

                    <PageActionRow className="mt-6">
                        <PrimaryButton
                            type="submit"
                            submitting={submitting}
                            disabled={submitting || !canSubmit}
                        >
                            Submit appeal
                        </PrimaryButton>
                        <Link href="/apply/status" className="liquid-btn liquid-btn-secondary">
                            Back to status
                        </Link>
                    </PageActionRow>
                </form>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
