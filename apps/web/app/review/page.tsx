'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ActiveMetaRow, ActiveStatusChip } from '@/components/active-patterns';
import { Button } from '@/components/ui/button';
import { PageLoadingState, RecoverableErrorPanel, StageTransitionNotice } from '@/components/ui-kit';
import { ActionPageCard, ActionPageShell } from '@/components/screen-patterns';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { ReviewFormSection, ReviewSuccessSection } from './review-sections';
import { useReviewSubmission } from './useReviewSubmission';

export default function ReviewPage() {
    const router = useRouter();
    const {
        stage,
        isLoading,
        sourceLabel,
        selected,
        escalationRequested,
        note,
        ackPhrase,
        submitted,
        submitting,
        submitError,
        canSubmit,
        toggleItem,
        setEscalationRequested,
        setNote,
        setAckPhrase,
        clearSubmitError,
        handleSubmit,
        noteLength,
    } = useReviewSubmission();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your attestation workspace"
                description="We are verifying ACTIVE access and loading trust-action context."
                lines={5}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="This area is available to ACTIVE members"
                description="Trust attestation is available after admission approval and SOUL credential issuance."
            />
        );
    }

    return (
        <ActionPageShell>
            <ActionPageCard
                className="max-w-3xl"
                title="Trust Attestation"
                description="Start with the checklist below. Add context only if it helps clarify what you directly observed."
                meta={(
                    <ActiveMetaRow>
                        <ActiveStatusChip>Connection • {sourceLabel}</ActiveStatusChip>
                    </ActiveMetaRow>
                )}
                contentClassName="space-y-6"
                footerClassName="flex flex-col gap-2 border-t border-[#ececf0] bg-[#fbfbfd]"
                footer={!submitted ? (
                    <>
                        <Button className="h-12 w-full" onClick={handleSubmit} disabled={!canSubmit || submitting}>
                            {submitting ? 'Submitting...' : 'Submit Attestation'}
                        </Button>
                        <Button variant="outline" className="h-12 w-full" onClick={() => router.push('/dashboard')}>
                            Back to Dashboard
                        </Button>
                    </>
                ) : (
                    <Button variant="outline" className="h-12 w-full" onClick={() => router.push('/dashboard')}>
                        Back to Dashboard
                    </Button>
                )}
            >
                {submitError && (
                    <RecoverableErrorPanel
                        title="We couldn’t submit your attestation"
                        message={submitError}
                        retryLabel="Try again"
                        onRetry={clearSubmitError}
                        secondaryHref="/dashboard"
                        secondaryLabel="Back to Dashboard"
                    />
                )}

                {!submitted ? (
                    <ReviewFormSection
                        selected={selected}
                        escalationRequested={escalationRequested}
                        note={note}
                        ackPhrase={ackPhrase}
                        onToggleItem={toggleItem}
                        onEscalationChange={setEscalationRequested}
                        onNoteChange={setNote}
                        onAckPhraseChange={setAckPhrase}
                    />
                ) : (
                    <ReviewSuccessSection submitted={submitted} noteLength={noteLength} />
                )}
            </ActionPageCard>
        </ActionPageShell>
    );
}
