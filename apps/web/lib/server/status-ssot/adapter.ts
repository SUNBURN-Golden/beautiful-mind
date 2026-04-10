import { deriveAdmissionStage } from '../admission-state-machine.ts';
import { STATUS_BLOCKER_CODES } from '../../contracts/status-codes.ts';
import type { AdmissionApplication, AdmissionDocument, StageSignals } from './types.ts';

export function buildStageSignals(params: {
    identity: unknown;
    application: AdmissionApplication | null;
    documents: AdmissionDocument[];
    verifiedClaims: Array<{ claim_type: string; verification_status: string }>;
    consentCompleted: boolean;
    contractsCompleted: boolean;
    documentsCompleted: boolean;
    latestExceptionCaseStatus: string | null;
    latestAppealStatus: string | null;
    latestAuditSampleStatus: string | null;
    openAuditCount: number;
    soulCredentialIssued: boolean;
}): StageSignals {
    const hasIdentity = Boolean(params.identity);
    const hasLiveness = Boolean(params.application?.liveness_verified_at)
        || params.verifiedClaims.some((claim) => (
            claim.claim_type === 'REAL_PERSON_VERIFIED'
            && claim.verification_status === 'VERIFIED'
        ));

    const hasResubmitRequest = params.documents.some((doc) => (
        doc.processing_status === 'RESUBMIT_REQUIRED'
        || doc.final_result === 'RESUBMIT_REQUIRED'
    ));
    const hasRejectedDocument = params.documents.some((doc) => doc.final_result === 'REJECTED');
    const hasExceptionCase = ['OPEN', 'UNDER_REVIEW'].includes(params.latestExceptionCaseStatus || '');
    const hasAppealOpen = ['OPEN', 'UNDER_REVIEW'].includes(params.latestAppealStatus || '');
    const hasAuditReview = ['OPEN', 'UNDER_REVIEW'].includes(params.latestAuditSampleStatus || '') || params.openAuditCount > 0;

    return {
        hasIdentity,
        hasLiveness,
        consentCompleted: params.consentCompleted,
        contractsCompleted: params.contractsCompleted,
        documentsCompleted: params.documentsCompleted,
        hasSoulCredential: params.soulCredentialIssued,
        hasResubmitRequest,
        hasRejectedDocument,
        hasExceptionCase,
        hasAppealOpen,
        hasAuditReview,
    };
}

export function deriveStageAndBlockers(params: {
    signals: StageSignals;
    application: AdmissionApplication | null;
    isFrozen: boolean;
}) {
    const { stage, blockers } = deriveAdmissionStage({
        hasIdentity: params.signals.hasIdentity,
        hasLiveness: params.signals.hasLiveness,
        consentCompleted: params.signals.consentCompleted,
        contractsCompleted: params.signals.contractsCompleted,
        documentsCompleted: params.signals.documentsCompleted,
        hasSoulCredential: params.signals.hasSoulCredential,
        application: params.application,
        hasResubmitRequest: params.signals.hasResubmitRequest,
        hasRejectedDocument: params.signals.hasRejectedDocument,
        hasExceptionCase: params.signals.hasExceptionCase,
        hasAppealOpen: params.signals.hasAppealOpen,
        hasAuditReview: params.signals.hasAuditReview,
    });

    const allBlockers = [...blockers];
    if (params.isFrozen) {
        allBlockers.push(STATUS_BLOCKER_CODES.ACCOUNT_FROZEN);
    }
    return {
        stage,
        blockers: allBlockers,
    };
}
