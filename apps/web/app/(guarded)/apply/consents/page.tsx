'use client';

import {
    FeedbackPanel,
    PageLoadingState,
    PrimaryButton,
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
import { ConsentChecklistSection } from './consent-sections';
import { useApplyConsents } from './useApplyConsents';

export default function ApplyConsentsPage() {
    const {
        stage,
        isLoading,
        submissionDone,
        submitting,
        toast,
        consentItems,
        completedCount,
        totalConsentCount,
        allChecked,
        allPhrasesValid,
        handleToggleConsent,
        handlePhraseChange,
        handleSubmit,
    } = useApplyConsents();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing consent confirmations"
                description="We’re syncing your saved consent state and current policy version."
                lines={4}
            />
        );
    }

    if (stage && stage !== 'CONSENTS') {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to your current consent step"
                description="Your status source of truth points to a different step, so we’re routing you there."
            />
        );
    }

    return (
        <FlowPageShell maxWidth="max-w-4xl">
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={3}
                    totalSteps={5}
                    title="Consent confirmations"
                    description="Review each consent individually and type the confirmation phrase exactly as shown. Nothing is pre-checked for you."
                />

                <FlowInfoGrid className="mt-6">
                    <FlowInfoCard
                        title="What you do now"
                        description="Confirm each handling area one by one and enter the exact acknowledgement phrase for each item."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="Once these confirmations are recorded, the document step becomes your next action."
                    />
                </FlowInfoGrid>

                <FlowInset title="Progress" className="mt-4">
                    {completedCount} of {totalConsentCount} confirmations selected
                </FlowInset>

                {submissionDone && (
                    <div className="mt-4">
                        <SuccessNextStepPanel
                            title="Consent confirmations submitted"
                            description="Once the status sync completes, the document step is ready. You can continue there now if you prefer."
                            primaryHref="/apply/documents"
                            primaryLabel="Continue to documents"
                            secondaryHref="/apply/status"
                            secondaryLabel="View status"
                        />
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <ConsentChecklistSection
                        consentItems={consentItems}
                        submitting={submitting}
                        onToggleConsent={handleToggleConsent}
                        onPhraseChange={handlePhraseChange}
                    />

                    <PageActionRow className="pt-2">
                        <PrimaryButton type="submit" submitting={submitting} disabled={submitting || !allChecked || !allPhrasesValid}>
                            Submit consents
                        </PrimaryButton>
                        {(!allChecked || !allPhrasesValid) && (
                            <div className="mt-3">
                                <FeedbackPanel
                                    tone="warning"
                                    title="A few items still need attention"
                                    description={!allChecked
                                        ? 'Select every consent item before you submit this step.'
                                        : 'Each confirmation phrase must match exactly before you can continue.'}
                                />
                            </div>
                        )}
                    </PageActionRow>
                </form>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
