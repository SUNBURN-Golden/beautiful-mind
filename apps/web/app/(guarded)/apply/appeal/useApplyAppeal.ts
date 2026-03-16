'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
    createAdmissionAppeal,
    fetchAdmissionAppealStatus,
    type AppealStatusResponse,
} from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

export const APPEAL_REASON_OPTIONS = [
    { value: 'DECISION_DISPUTE', label: 'Decision outcome dispute' },
    { value: 'DOCUMENT_MISREAD', label: 'Document was misread' },
    { value: 'MISSING_CONTEXT', label: 'Important context is missing' },
    { value: 'OTHER', label: 'Other reason' },
] as const;

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

export function useApplyAppeal() {
    const { isLoading, refetch, currentStage } = useStatus();
    const [reasonCode, setReasonCode] = useState<string>(APPEAL_REASON_OPTIONS[0].value);
    const [statement, setStatement] = useState('');
    const [evidenceRef, setEvidenceRef] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [checking, setChecking] = useState(false);
    const [appealStatus, setAppealStatus] = useState<AppealStatusResponse | null>(null);
    const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
    const [submitDone, setSubmitDone] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const loadAppealStatus = useCallback(async () => {
        setChecking(true);
        setStatusLoadError(null);

        try {
            const payload = await fetchAdmissionAppealStatus();
            setAppealStatus(payload);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'APPEAL_STATUS_LOAD_FAILED';
            setToast({ text: `We could not load your current appeal status: ${message}`, type: 'error' });
            setStatusLoadError(message);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        void loadAppealStatus();
    }, [loadAppealStatus]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setToast(null);
        setSubmitDone(false);

        try {
            await createAdmissionAppeal({
                reason_code: reasonCode,
                statement: statement.trim(),
                evidence_ref: evidenceRef.trim() || undefined,
            });

            setToast({ text: 'Your appeal has been submitted. You can track the review from the status page.', type: 'success' });
            setSubmitDone(true);
            await refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'APPEAL_CREATE_FAILED';
            setToast({ text: `We could not submit your appeal: ${message}`, type: 'error' });
            setSubmitDone(false);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        stage: currentStage,
        isLoading,
        reasonCode,
        statement,
        evidenceRef,
        submitting,
        checking,
        existingAppeal: appealStatus?.data?.appeal ?? null,
        statusLoadError,
        submitDone,
        toast,
        canSubmit: statement.trim().length >= 10,
        setReasonCode,
        setStatement,
        setEvidenceRef,
        retryLoadAppealStatus: () => {
            void loadAppealStatus();
        },
        handleSubmit,
    };
}
