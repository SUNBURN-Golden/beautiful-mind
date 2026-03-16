'use client';

import { useState } from 'react';
import { startAdmissionApplication } from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

export function useApplyStart() {
    const { isLoading, refetch, currentStage } = useStatus();
    const [submitting, setSubmitting] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [started, setStarted] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const handleStart = async () => {
        setSubmitting(true);
        setToast(null);
        setLastError(null);
        setStarted(false);

        try {
            await startAdmissionApplication();
            setToast({ text: 'Admission started. Identity verification is next.', type: 'success' });
            setStarted(true);
            await refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'START_FAILED';
            setToast({ text: `We couldn’t start admission: ${message}`, type: 'error' });
            setLastError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        stage: currentStage,
        isLoading,
        submitting,
        lastError,
        started,
        toast,
        handleStart,
    };
}
