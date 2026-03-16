'use client';

import {
    formatConsentTypeLabel,
    formatDocumentTypeLabel,
    getStatusBlockerCopy,
    getStatusDecisionReasonCopy,
    getStatusErrorCopy,
    getStatusRecoveryActions,
    getStatusStageCopy,
} from '@/lib/contracts/status-copy';
import { ADMISSION_STAGES, type AdmissionStage } from '@/lib/contracts/status-stages';
import { useStatus } from '@/lib/useStatus';

const ALLOWED_STATUS_STAGES: ReadonlySet<AdmissionStage> = new Set([
    ADMISSION_STAGES.AI_DECISION,
    ADMISSION_STAGES.RESUBMIT_REQUIRED,
    ADMISSION_STAGES.REJECTED,
    ADMISSION_STAGES.EXCEPTION_REVIEW,
    ADMISSION_STAGES.APPEAL_PENDING,
    ADMISSION_STAGES.AUDIT_REVIEW,
    ADMISSION_STAGES.APPROVED,
    ADMISSION_STAGES.SOUL_ISSUED,
    ADMISSION_STAGES.ACTIVE,
]);

function toArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
}

export function useApplyStatusView() {
    const { status, isLoading, isRefreshing, refetch, lastUpdatedAt, currentStage } = useStatus({
        refreshIntervalMs: 5000,
    });

    const stage = currentStage;
    const blockers = Array.isArray(status?.blockers) ? status.blockers : [];
    const statusError = typeof status?.error === 'string' ? status.error : null;
    const statusErrorCopy = getStatusErrorCopy(statusError);
    const isStageSupported = stage ? ALLOWED_STATUS_STAGES.has(stage as AdmissionStage) : false;

    const meta = status?.meta || {};
    const missingDocs = toArray(status?.details?.missing_document_types);
    const missingConsents = toArray(status?.details?.missing_consents);

    const reviewState = typeof meta.review_case_state === 'string' ? meta.review_case_state : 'N/A';
    const reviewQueueType = typeof meta.review_queue_type === 'string' ? meta.review_queue_type : 'NONE';
    const admissionStatus = typeof meta.admission_status === 'string' ? meta.admission_status : 'PENDING';
    const soulIssued = meta.soul_credential_issued === true;
    const decisionFinal = typeof meta.ai_decision_final === 'string' ? meta.ai_decision_final : 'N/A';
    const decisionReasonCode = typeof meta.ai_decision_reason_code === 'string' ? meta.ai_decision_reason_code : null;
    const decisionReason = getStatusDecisionReasonCopy(decisionReasonCode);
    const decisionConfidence = typeof meta.ai_decision_confidence === 'number'
        ? meta.ai_decision_confidence.toFixed(2)
        : 'N/A';
    const appealStatus = typeof meta.appeal_status === 'string' ? meta.appeal_status : 'NONE';
    const exceptionStatus = typeof meta.exception_case_status === 'string' ? meta.exception_case_status : 'NONE';
    const isActive = stage === ADMISSION_STAGES.ACTIVE;
    const lastSynced = lastUpdatedAt
        ? new Date(lastUpdatedAt).toLocaleTimeString('en-GB', { hour12: false })
        : 'Not available';

    const stageCopy = stage ? getStatusStageCopy(stage) : null;
    const recommendedActions = getStatusRecoveryActions(blockers);
    const blockerGuidance = blockers.map((code) => ({
        code,
        copy: getStatusBlockerCopy(code),
    }));
    const missingDocLabels = missingDocs.map(formatDocumentTypeLabel);
    const missingConsentLabels = missingConsents.map(formatConsentTypeLabel);

    return {
        status,
        isLoading,
        isRefreshing,
        refetch,
        stage,
        statusError,
        statusErrorCopy,
        isStageSupported,
        reviewState,
        reviewQueueType,
        admissionStatus,
        soulIssued,
        decisionFinal,
        decisionReasonCode,
        decisionReason,
        decisionConfidence,
        appealStatus,
        exceptionStatus,
        isActive,
        lastSynced,
        stageCopy,
        recommendedActions,
        blockerGuidance,
        missingDocs,
        missingConsents,
        missingDocLabels,
        missingConsentLabels,
    };
}
