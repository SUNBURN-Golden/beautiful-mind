'use client';

import { useState } from 'react';
import { triggerAdmissionDecision } from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

export function useApplyReview() {
    const { status, isLoading, refetch, currentStage } = useStatus();
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [decisionRequested, setDecisionRequested] = useState(false);

    const decision = typeof status?.meta?.ai_decision_final === 'string' ? status.meta.ai_decision_final : null;
    const reason = typeof status?.meta?.ai_decision_reason_code === 'string' ? status.meta.ai_decision_reason_code : null;

    const handleSubmit = async () => {
        setSubmitting(true);
        setToast(null);
        setLastError(null);
        setDecisionRequested(false);

        try {
            await triggerAdmissionDecision();
            setToast({ text: 'The AI decision run has started. Check the status page for the latest outcome.', type: 'success' });
            setDecisionRequested(true);
            await refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'REVIEW_SUBMIT_FAILED';
            setToast({ text: `We couldn't run the AI decision: ${message}`, type: 'error' });
            setLastError(message);
            setDecisionRequested(false);
        } finally {
            setSubmitting(false);
        }
    };

    const retrySubmit = () => {
        setLastError(null);
        void handleSubmit();
    };

    return {
        stage: currentStage,
        isLoading,
        decision,
        reason,
        submitting,
        toast,
        lastError,
        decisionRequested,
        handleSubmit,
        retrySubmit,
    };
}
