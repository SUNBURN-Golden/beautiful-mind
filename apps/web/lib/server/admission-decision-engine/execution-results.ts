import { ADMISSION_STAGES } from '../../contracts/status-stages.ts';
import type { ExecuteAdmissionDecisionResult } from './types';

type BaseDecisionResultParams = {
    soulCredentialId: string | null;
    exceptionCaseId: string | null;
    reviewCaseId: string | null;
    purgedCount: number;
};

function buildBaseDecisionResult(params: BaseDecisionResultParams): Omit<ExecuteAdmissionDecisionResult, 'applicationStatus' | 'nextStep' | 'resubmitDocumentTypes'> {
    return {
        soulCredentialId: params.soulCredentialId,
        exceptionCaseId: params.exceptionCaseId,
        reviewCaseId: params.reviewCaseId,
        purgedCount: params.purgedCount,
    };
}

export function buildApproveDecisionResult(
    params: BaseDecisionResultParams,
): ExecuteAdmissionDecisionResult {
    return {
        ...buildBaseDecisionResult(params),
        applicationStatus: 'ACTIVE',
        nextStep: ADMISSION_STAGES.ACTIVE,
        resubmitDocumentTypes: [],
    };
}

export function buildExceptionDecisionResult(
    params: BaseDecisionResultParams,
): ExecuteAdmissionDecisionResult {
    return {
        ...buildBaseDecisionResult(params),
        applicationStatus: 'EXCEPTION_REQUIRED',
        nextStep: ADMISSION_STAGES.EXCEPTION_REVIEW,
        resubmitDocumentTypes: [],
    };
}

export function buildRejectDecisionResult(
    params: BaseDecisionResultParams,
): ExecuteAdmissionDecisionResult {
    return {
        ...buildBaseDecisionResult(params),
        applicationStatus: 'REJECTED',
        nextStep: ADMISSION_STAGES.REJECTED,
        resubmitDocumentTypes: [],
    };
}

export function buildResubmitDecisionResult(
    params: BaseDecisionResultParams & { resubmitDocumentTypes: string[] },
): ExecuteAdmissionDecisionResult {
    return {
        ...buildBaseDecisionResult(params),
        applicationStatus: 'RESUBMIT_REQUIRED',
        nextStep: ADMISSION_STAGES.RESUBMIT_REQUIRED,
        resubmitDocumentTypes: params.resubmitDocumentTypes,
    };
}
