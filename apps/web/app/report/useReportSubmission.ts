'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitIncidentReport, type ContractSource } from '@/lib/active-contract';
import { useStatus } from '@/lib/useStatus';

type SubmittedState = {
    reportId: string;
    submittedAt: string;
    escalationQueued: boolean;
    linkedMatchId: string | null;
};

export function useReportSubmission() {
    const searchParams = useSearchParams();
    const { isLoading, currentStage } = useStatus();
    const stage = currentStage;

    const queryMatchId = searchParams?.get('matchId') || '';
    const queryPartnerName = searchParams?.get('partnerName') || '';

    const [targetLabel, setTargetLabel] = useState(queryPartnerName);
    const [summary, setSummary] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<ContractSource | null>(null);
    const [submitted, setSubmitted] = useState<SubmittedState | null>(null);

    const sourceLabel = source === 'ADAPTER'
        ? 'Continuity mode'
        : source === 'API'
            ? 'Live sync'
            : 'Syncing';
    const hasMatchContext = useMemo(() => queryMatchId.length > 0, [queryMatchId]);
    const summaryLength = summary.trim().length;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(null);

        try {
            const response = await submitIncidentReport({
                summary: summary.trim(),
                targetLabel: targetLabel.trim() || null,
                matchId: queryMatchId || null,
            });
            setSource(response.source);
            setSubmitted(response.data);
        } catch (submitError: unknown) {
            const message = submitError instanceof Error ? submitError.message : 'INCIDENT_SUBMIT_FAILED';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
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
        clearError: () => setError(null),
        handleSubmit,
    };
}
