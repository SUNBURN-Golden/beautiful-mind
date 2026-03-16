'use client';

import { useMemo, useState } from 'react';
import { submitTrustAttestation, type ContractSource } from '@/lib/active-contract';
import { TRUST_ATTESTATION_ACK_PHRASE } from '@/lib/contracts/active-review-contract';
import { useStatus } from '@/lib/useStatus';
import { ATTESTATION_ITEMS, type SubmittedPayload } from './review-content';

export function useReviewSubmission() {
    const { isLoading, currentStage } = useStatus();
    const stage = currentStage;
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [escalationRequested, setEscalationRequested] = useState(false);
    const [note, setNote] = useState('');
    const [ackPhrase, setAckPhrase] = useState('');
    const [submitted, setSubmitted] = useState<SubmittedPayload | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [source, setSource] = useState<ContractSource | null>(null);

    const selectedItems = useMemo(
        () => ATTESTATION_ITEMS.filter((item) => selected[item.id]).map((item) => item.id),
        [selected],
    );

    const canSubmit = selectedItems.length > 0 && ackPhrase.trim() === TRUST_ATTESTATION_ACK_PHRASE;
    const sourceLabel = source === 'ADAPTER'
        ? 'Continuity mode'
        : source === 'API'
            ? 'Live sync'
            : 'Syncing';

    const toggleItem = (id: string) => {
        setSelected((previous) => ({ ...previous, [id]: !previous[id] }));
    };

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitError(null);
        setSubmitting(true);
        try {
            const response = await submitTrustAttestation({
                selectedItems,
                escalationRequested,
                note,
                ackPhrase,
            });
            setSource(response.source);
            setSubmitted(response.data);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'ATTESTATION_SUBMIT_FAILED';
            setSubmitError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
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
        clearSubmitError: () => setSubmitError(null),
        handleSubmit,
        noteLength: note.trim().length,
    };
}
