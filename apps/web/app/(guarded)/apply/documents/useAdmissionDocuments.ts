'use client';

import { useMemo, useState } from 'react';
import {
    ADMISSION_DOCUMENTS,
    type AdmissionDocumentType,
    submitAdmissionDocument,
    uploadAdmissionDocument,
} from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

type RequiredDocumentMeta = {
    type?: string;
    status?: string;
    upload_status?: string;
    processing_status?: string;
    ai_confidence?: number | null;
    purged_at?: string | null;
};

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

function getDocMetaMap(value: unknown) {
    const map = new Map<string, RequiredDocumentMeta>();
    if (!Array.isArray(value)) {
        return map;
    }

    for (const row of value) {
        if (!row || typeof row !== 'object') continue;
        const casted = row as RequiredDocumentMeta;
        if (typeof casted.type !== 'string') continue;
        map.set(casted.type, casted);
    }
    return map;
}

export function statusLabel(value: string | undefined) {
    switch (value) {
        case 'VERIFIED':
            return 'Verified';
        case 'RESUBMIT_REQUIRED':
            return 'Resubmission needed';
        case 'REJECTED':
            return 'Rejected';
        case 'UPLOADED':
        case 'REPLACED':
            return 'Uploaded';
        case 'PENDING':
            return 'Pending';
        default:
            return 'Not submitted';
    }
}

export function useAdmissionDocuments() {
    const { status, isLoading, refetch, currentStage } = useStatus();
    const stage = currentStage;

    const [filesByType, setFilesByType] = useState<Record<string, File | null>>({});
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastSuccessType, setLastSuccessType] = useState<AdmissionDocumentType | null>(null);

    const requiredDocs = status?.meta?.required_documents;
    const docMetaMap = useMemo(() => getDocMetaMap(requiredDocs), [requiredDocs]);
    const verifiedCount = useMemo(() => (
        ADMISSION_DOCUMENTS.filter((document) => docMetaMap.get(document.type)?.status === 'VERIFIED').length
    ), [docMetaMap]);
    const isResubmit = stage === 'RESUBMIT_REQUIRED';

    const setFileForType = (documentType: AdmissionDocumentType, file: File | null) => {
        setFilesByType((current) => ({ ...current, [documentType]: file }));
    };

    const uploadAndSubmit = async (documentType: AdmissionDocumentType) => {
        const file = filesByType[documentType];
        if (!file) {
            setToast({ text: 'Choose a file before you submit this document.', type: 'info' });
            return;
        }

        setUploadingType(documentType);
        setToast(null);
        setLastError(null);

        try {
            const uploadResult = await uploadAdmissionDocument({
                documentType,
                file,
            });

            await submitAdmissionDocument({
                submission_id: uploadResult.submission.id,
            });

            setToast({ text: 'The document was uploaded and the first review completed. Refreshing status now.', type: 'success' });
            setLastSuccessType(documentType);
            await refetch();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'DOCUMENT_UPLOAD_FAILED';
            setToast({ text: `We couldn’t process that document: ${message}`, type: 'error' });
            setLastError(message);
            setLastSuccessType(null);
        } finally {
            setUploadingType(null);
        }
    };

    return {
        stage,
        isLoading,
        docMetaMap,
        verifiedCount,
        isResubmit,
        toast,
        lastError,
        lastSuccessType,
        uploadingType,
        setFileForType,
        clearLastErrorAndRefetch: () => {
            setLastError(null);
            void refetch();
        },
        uploadAndSubmit,
    };
}
