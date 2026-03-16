'use client';

import { useState } from 'react';
import { submitParticipationRevoke, type ContractSource } from '@/lib/active-contract';
import { useStatus } from '@/lib/useStatus';

type SubmittedPayload = {
    requestId: string;
    submittedAt: string;
    status: 'RECEIVED';
    hiddenMatches: number;
};

export function useRevokePreferences() {
    const { isLoading, currentStage } = useStatus();
    const stage = currentStage;

    const [pauseParticipation, setPauseParticipation] = useState(false);
    const [withdrawDataProcessing, setWithdrawDataProcessing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<ContractSource | null>(null);
    const [submitted, setSubmitted] = useState<SubmittedPayload | null>(null);

    const sourceLabel = source === 'ADAPTER'
        ? 'Continuity mode'
        : source === 'API'
            ? 'Live sync'
            : 'Syncing';
    const canSubmit = pauseParticipation || withdrawDataProcessing;
    const submittedStatusLabel = submitted?.status === 'RECEIVED' ? 'Received' : submitted?.status;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit || submitting) {
            return;
        }

        setError(null);
        setSubmitting(true);
        try {
            const response = await submitParticipationRevoke({
                pauseParticipation,
                withdrawDataProcessing,
            });
            setSource(response.source);
            setSubmitted(response.data);
        } catch (submitError: unknown) {
            const message = submitError instanceof Error ? submitError.message : 'REVOKE_SUBMIT_FAILED';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
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
        clearError: () => setError(null),
        handleSubmit,
    };
}
