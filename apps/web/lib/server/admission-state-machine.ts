import {
    ADMISSION_STAGES,
    LEGACY_ADMISSION_STAGE_CODES,
    isLegacyAdmissionStageCode,
    normalizeAdmissionStage,
    type AdmissionStage,
} from '../contracts/status-stages.ts';
import {
    STATUS_BLOCKER_CODES,
    type StatusBlockerCode,
} from '../contracts/status-codes.ts';
export { ADMISSION_STAGES, type AdmissionStage } from '../contracts/status-stages.ts';
export type AdmissionApplicationSnapshot = {
    status: string;
    current_step: string;
    soul_issued_at: string | null;
};

export type DeriveAdmissionStageParams = {
    hasIdentity: boolean;
    hasLiveness: boolean;
    consentCompleted: boolean;
    documentsCompleted: boolean;
    hasSoulCredential: boolean;
    application: AdmissionApplicationSnapshot | null;
    hasResubmitRequest: boolean;
    hasRejectedDocument: boolean;
    hasExceptionCase?: boolean;
    hasAppealOpen?: boolean;
    hasAuditReview?: boolean;
};

export type DeriveAdmissionStageResult = {
    stage: AdmissionStage;
    blockers: StatusBlockerCode[];
};

export function asAdmissionStage(value: string | null | undefined): AdmissionStage | null {
    return normalizeAdmissionStage(value);
}

function resolveStageFromCurrentStep(
    currentStep: string,
    blockers: StatusBlockerCode[],
): AdmissionStage | null {
    if (isLegacyAdmissionStageCode(currentStep)) {
        if (currentStep === LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW) {
            blockers.push(STATUS_BLOCKER_CODES.LEGACY_REVIEW_STAGE);
            return ADMISSION_STAGES.EXCEPTION_REVIEW;
        }
        if (currentStep === LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW) {
            return ADMISSION_STAGES.AI_DECISION;
        }
    }
    return asAdmissionStage(currentStep);
}

export function deriveAdmissionStage(params: DeriveAdmissionStageParams): DeriveAdmissionStageResult {
    const blockers: StatusBlockerCode[] = [];
    const app = params.application;

    // 0) Fast-path: already active with soul credential.
    if (params.hasSoulCredential && app?.status === ADMISSION_STAGES.ACTIVE) {
        return { stage: ADMISSION_STAGES.ACTIVE, blockers };
    }

    // 1) Hard preconditions in strict order.
    if (!app) {
        blockers.push(STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED);
        return { stage: ADMISSION_STAGES.APPLY_START, blockers };
    }

    if (!params.hasIdentity) {
        blockers.push(STATUS_BLOCKER_CODES.IDENTITY_REQUIRED);
        return { stage: ADMISSION_STAGES.IDENTITY, blockers };
    }

    if (!params.hasLiveness) {
        blockers.push(STATUS_BLOCKER_CODES.LIVENESS_REQUIRED);
        return { stage: ADMISSION_STAGES.LIVENESS, blockers };
    }

    if (!params.consentCompleted) {
        blockers.push(STATUS_BLOCKER_CODES.CONSENTS_REQUIRED);
        return { stage: ADMISSION_STAGES.CONSENTS, blockers };
    }

    // 2) Explicit application-status queue states.
    if (app.status === ADMISSION_STAGES.RESUBMIT_REQUIRED) {
        blockers.push(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED);
        return { stage: ADMISSION_STAGES.RESUBMIT_REQUIRED, blockers };
    }

    if (app.status === ADMISSION_STAGES.REJECTED) {
        blockers.push(STATUS_BLOCKER_CODES.ADMISSION_REJECTED);
        return { stage: ADMISSION_STAGES.REJECTED, blockers };
    }

    if (app.status === 'EXCEPTION_REQUIRED' || params.hasExceptionCase) {
        blockers.push(STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED);
        return { stage: ADMISSION_STAGES.EXCEPTION_REVIEW, blockers };
    }

    if (app.status === ADMISSION_STAGES.APPEAL_PENDING || params.hasAppealOpen) {
        blockers.push(STATUS_BLOCKER_CODES.APPEAL_PENDING);
        return { stage: ADMISSION_STAGES.APPEAL_PENDING, blockers };
    }

    if (app.status === ADMISSION_STAGES.AUDIT_REVIEW || params.hasAuditReview) {
        blockers.push(STATUS_BLOCKER_CODES.AUDIT_REVIEW_PENDING);
        return { stage: ADMISSION_STAGES.AUDIT_REVIEW, blockers };
    }

    // 3) Document completeness and doc-level retry signals.
    if (!params.documentsCompleted) {
        blockers.push(STATUS_BLOCKER_CODES.DOCUMENTS_REQUIRED);
        if (params.hasResubmitRequest || params.hasRejectedDocument) {
            blockers.push(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED);
            return { stage: ADMISSION_STAGES.RESUBMIT_REQUIRED, blockers };
        }
        return { stage: ADMISSION_STAGES.DOCUMENTS, blockers };
    }

    // 4) AI decision + credential issuance lifecycle.
    if (
        app.status === LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW
        || app.current_step === ADMISSION_STAGES.AI_DECISION
        || app.current_step === LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW
    ) {
        blockers.push(STATUS_BLOCKER_CODES.AI_DECISION_PENDING);
        return { stage: ADMISSION_STAGES.AI_DECISION, blockers };
    }

    if (app.status === ADMISSION_STAGES.APPROVED && !app.soul_issued_at) {
        blockers.push(STATUS_BLOCKER_CODES.SOUL_ISSUANCE_PENDING);
        return { stage: ADMISSION_STAGES.APPROVED, blockers };
    }

    if (app.soul_issued_at && app.status !== ADMISSION_STAGES.ACTIVE) {
        return { stage: ADMISSION_STAGES.SOUL_ISSUED, blockers };
    }

    if (app.status === ADMISSION_STAGES.ACTIVE && params.hasSoulCredential) {
        return { stage: ADMISSION_STAGES.ACTIVE, blockers };
    }

    // 5) Fallback to application current_step (with legacy normalization).
    const fallbackStage = resolveStageFromCurrentStep(app.current_step, blockers);
    if (fallbackStage) {
        return { stage: fallbackStage, blockers };
    }

    // 6) Unknown state fallback.
    return { stage: ADMISSION_STAGES.APPLY_START, blockers };
}
