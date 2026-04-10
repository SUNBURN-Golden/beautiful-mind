import { ADMISSION_POLICY_VERSION } from '../admission-core.ts';
import { buildConsentProgress, buildContractProgress, requiredDocumentProgress } from './progress.ts';
import { buildStageSignals, deriveStageAndBlockers } from './adapter.ts';
import type {
    StatusOverlayInputs,
    StatusResponse,
    StatusTruthInputs,
    StatusTruthOverlayInputs,
} from './types.ts';

export type DerivedStatusTruth = {
    profile: StatusTruthInputs['profile'];
    application: StatusTruthInputs['application'];
    documentProgress: ReturnType<typeof requiredDocumentProgress>;
    consentProgress: ReturnType<typeof buildConsentProgress>;
    contractProgress: ReturnType<typeof buildContractProgress>;
    stageSignals: ReturnType<typeof buildStageSignals>;
    stage: StatusResponse['stage'];
    blockers: StatusResponse['blockers'];
};

export const EMPTY_STATUS_TRUTH_OVERLAYS: StatusTruthOverlayInputs = {
    openAudits: [],
    latestAppeal: null,
    latestExceptionCase: null,
    latestAuditSample: null,
};

export const EMPTY_STATUS_OVERLAYS: StatusOverlayInputs = {
    reviewCase: null,
    latestSbtClaim: null,
    latestDecisionRun: null,
};

export function deriveStatusTruth(truth: StatusTruthInputs): DerivedStatusTruth {
    const profile = truth.profile;
    const application = truth.application;
    const documentProgress = requiredDocumentProgress(truth.documents);
    const consentProgress = buildConsentProgress(truth.consentEvents, ADMISSION_POLICY_VERSION);
    const contractProgress = buildContractProgress(truth.contractAcceptances);

    const stageSignals = buildStageSignals({
        identity: truth.identity,
        application,
        documents: truth.documents,
        verifiedClaims: truth.verifiedClaims,
        consentCompleted: consentProgress.consentCompleted,
        contractsCompleted: contractProgress.contractsCompleted,
        documentsCompleted: documentProgress.missing.length === 0,
        latestExceptionCaseStatus: truth.latestExceptionCase?.status || null,
        latestAppealStatus: truth.latestAppeal?.status || null,
        latestAuditSampleStatus: truth.latestAuditSample?.status || null,
        openAuditCount: truth.openAudits.length,
        soulCredentialIssued: truth.soulCredential?.status === 'ISSUED',
    });

    const { stage, blockers } = deriveStageAndBlockers({
        signals: stageSignals,
        application,
        isFrozen: profile?.is_frozen === true,
    });

    return {
        profile,
        application,
        documentProgress,
        consentProgress,
        contractProgress,
        stageSignals,
        stage,
        blockers,
    };
}
