'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ADMISSION_POLICY_VERSION } from '@/lib/admission-policy';
import { ADMISSION_CONSENTS, submitAdmissionConsents } from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;
type ConsentItemView = (typeof ADMISSION_CONSENTS)[number] & {
    checked: boolean;
    phraseInput: string;
    phraseMatches: boolean;
};

function createDefaultChecks() {
    return Object.fromEntries(ADMISSION_CONSENTS.map((item) => [item.type, false])) as Record<string, boolean>;
}

function createDefaultPhrases() {
    return Object.fromEntries(ADMISSION_CONSENTS.map((item) => [item.type, ''])) as Record<string, string>;
}

export function useApplyConsents() {
    const { isLoading, refetch, currentStage } = useStatus();
    const [submissionDone, setSubmissionDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [checkedByType, setCheckedByType] = useState<Record<string, boolean>>(() => createDefaultChecks());
    const [phraseByType, setPhraseByType] = useState<Record<string, string>>(() => createDefaultPhrases());

    const consentItems = useMemo<ConsentItemView[]>(() => (
        ADMISSION_CONSENTS.map((item) => {
            const phraseInput = phraseByType[item.type] || '';
            return {
                ...item,
                checked: checkedByType[item.type] === true,
                phraseInput,
                phraseMatches: phraseInput.trim().toUpperCase() === item.phrase,
            };
        })
    ), [checkedByType, phraseByType]);

    const allChecked = consentItems.every((item) => item.checked);
    const allPhrasesValid = consentItems.every((item) => item.phraseMatches);
    const completedCount = consentItems.filter((item) => item.checked).length;

    const handleToggleConsent = (type: string, checked: boolean) => {
        setCheckedByType((current) => ({ ...current, [type]: checked }));
    };

    const handlePhraseChange = (type: string, value: string) => {
        setPhraseByType((current) => ({ ...current, [type]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setToast(null);

        try {
            await submitAdmissionConsents({
                policy_version: ADMISSION_POLICY_VERSION,
                consents: ADMISSION_CONSENTS.map((item) => ({
                    consent_type: item.type,
                    granted: checkedByType[item.type] === true,
                    typed_ack_phrase: phraseByType[item.type],
                })),
            });

            setToast({ text: 'Consent confirmations submitted. Documents are next.', type: 'success' });
            setSubmissionDone(true);
            await refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'CONSENT_SUBMIT_FAILED';
            setToast({ text: `We couldn’t submit your consents: ${message}`, type: 'error' });
            setSubmissionDone(false);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        stage: currentStage,
        isLoading,
        submissionDone,
        submitting,
        toast,
        consentItems,
        completedCount,
        totalConsentCount: ADMISSION_CONSENTS.length,
        allChecked,
        allPhrasesValid,
        handleToggleConsent,
        handlePhraseChange,
        handleSubmit,
    };
}
