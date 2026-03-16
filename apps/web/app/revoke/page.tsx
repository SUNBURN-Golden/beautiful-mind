'use client';

import React from 'react';
import { ActiveMetaRow, ActiveStatusChip } from '@/components/active-patterns';
import {
    PageLoadingState,
    RecoverableErrorPanel,
    StageTransitionNotice,
} from '@/components/ui-kit';
import { ActionPageCard, ActionPageShell } from '@/components/screen-patterns';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { RevokeFormSection, RevokeSuccessSection } from './revoke-sections';
import { useRevokePreferences } from './useRevokePreferences';

export default function RevokePage() {
    const {
        stage,
        isLoading,
        pauseParticipation,
        withdrawDataProcessing,
        submitting,
        error,
        submitted,
        sourceLabel,
        canSubmit,
        submittedStatusLabel,
        setPauseParticipation,
        setWithdrawDataProcessing,
        clearError,
        handleSubmit,
    } = useRevokePreferences();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your preference controls"
                description="We are verifying ACTIVE access and current account state."
                lines={4}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="This area is available to ACTIVE members"
                description="Participation and data-processing controls are available after admission approval and SOUL credential issuance."
            />
        );
    }

    return (
        <ActionPageShell maxWidth="max-w-xl">
            <ActionPageCard
                className="max-w-xl"
                title="Participation & Data Preferences"
                description="Choose the preference change you want to make now. Status and policy detail remain available after submission."
                meta={(
                    <ActiveMetaRow>
                        <ActiveStatusChip>Connection • {sourceLabel}</ActiveStatusChip>
                    </ActiveMetaRow>
                )}
            >
                {!submitted ? (
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <RecoverableErrorPanel
                                title="We couldn’t submit your preference update"
                                message={error}
                                retryLabel="Try again"
                                onRetry={clearError}
                                secondaryHref="/dashboard"
                                secondaryLabel="Back to Dashboard"
                            />
                        )}
                        <RevokeFormSection
                            pauseParticipation={pauseParticipation}
                            withdrawDataProcessing={withdrawDataProcessing}
                            submitting={submitting}
                            canSubmit={canSubmit}
                            onPauseChange={setPauseParticipation}
                            onWithdrawChange={setWithdrawDataProcessing}
                        />
                    </form>
                ) : (
                    <RevokeSuccessSection submitted={submitted} submittedStatusLabel={submittedStatusLabel} />
                )}
            </ActionPageCard>
        </ActionPageShell>
    );
}
