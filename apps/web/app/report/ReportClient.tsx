'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ActiveMetaRow, ActiveStatusChip } from '@/components/active-patterns';
import {
    PageLoadingState,
    RecoverableErrorPanel,
    StageTransitionNotice,
} from '@/components/ui-kit';
import { ActionPageCard, ActionPageShell } from '@/components/screen-patterns';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { ReportFormSection, ReportSuccessSection } from './report-sections';
import { useReportSubmission } from './useReportSubmission';

export default function ReportClient() {
    const router = useRouter();
    const {
        stage,
        isLoading,
        queryMatchId,
        targetLabel,
        summary,
        submitting,
        error,
        submitted,
        sourceLabel,
        hasMatchContext,
        summaryLength,
        setTargetLabel,
        setSummary,
        clearError,
        handleSubmit,
    } = useReportSubmission();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing the report workspace"
                description="We are verifying ACTIVE access and session context."
                lines={4}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="This area is available to ACTIVE members"
                description="Incident reporting is available after admission approval and SOUL credential issuance."
            />
        );
    }

    return (
        <ActionPageShell maxWidth="max-w-md">
            <ActionPageCard
                className="max-w-md"
                title="Safety Report"
                description="Start with the key facts. Linked context and review detail stay available without getting in the way."
                meta={(
                    <ActiveMetaRow className="justify-center">
                        <ActiveStatusChip tone="danger">Connection • {sourceLabel}</ActiveStatusChip>
                    </ActiveMetaRow>
                )}
                headerClassName="rounded-t-3xl border-b border-[#f3d1d1] bg-[#fff5f5] text-[#7f1d1d] text-center"
                titleClassName="text-center text-[28px] font-semibold tracking-tight"
                descriptionClassName="mt-1 text-center text-[#9f3434]"
                contentClassName="space-y-6 pt-6"
            >
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <RecoverableErrorPanel
                                title="We couldn’t submit your report"
                                message={error}
                                retryLabel="Try again"
                                onRetry={clearError}
                                secondaryHref="/dashboard"
                                secondaryLabel="Back to Dashboard"
                            />
                        )}
                        <ReportFormSection
                            hasMatchContext={hasMatchContext}
                            queryMatchId={queryMatchId}
                            targetLabel={targetLabel}
                            summary={summary}
                            summaryLength={summaryLength}
                            submitting={submitting}
                            onTargetLabelChange={setTargetLabel}
                            onSummaryChange={setSummary}
                            onBackToDashboard={() => router.push('/dashboard')}
                        />
                    </form>
                ) : (
                    <ReportSuccessSection submitted={submitted} />
                )}
            </ActionPageCard>
        </ActionPageShell>
    );
}
