import type { StatusBlockerCode } from '../../contracts/status-codes.ts';
import type { AdmissionStage } from '../../contracts/status-stages.ts';

export type JsonObject = Record<string, unknown>;

export type AdmissionApplication = {
    id: string;
    status: string;
    current_step: string;
    policy_version: string | null;
    submitted_at: string | null;
    ai_review_started_at: string | null;
    ai_review_completed_at: string | null;
    human_review_started_at: string | null;
    human_review_completed_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_reason_code: string | null;
    liveness_verified_at: string | null;
    soul_issued_at: string | null;
    activated_at: string | null;
};

export type AdmissionDocument = {
    document_type: string;
    upload_status: string;
    processing_status: string;
    final_result: string;
    ai_confidence: number | null;
    uploaded_at: string | null;
    processed_at: string | null;
    purged_at: string | null;
};

export type ConsentEvent = {
    consent_type: string;
    granted_at: string;
    policy_version: string | null;
};

export type ContractAcceptance = {
    document_slug: string;
    version_id: string;
    accepted_at: string;
};

export type SoulCredential = {
    id: string;
    status: string;
    issued_at: string;
};

export type ReviewCase = {
    id: string;
    state: string;
    ai_summary_json: Record<string, unknown> | null;
    opened_at: string;
    decided_at: string | null;
};

export type DecisionRun = {
    id: string;
    final_decision: string;
    confidence_score: number | null;
    escalation_reason_code: string | null;
    ai_outputs_json: Record<string, unknown> | null;
    created_at: string;
};

export type AppealRow = {
    id: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
};

export type ExceptionCaseRow = {
    id: string;
    status: string;
    reason_code: string;
    created_at: string;
    resolved_at: string | null;
};

export type AuditSampleRow = {
    id: string;
    status: string;
    sample_reason: string;
    created_at: string;
    reviewed_at: string | null;
};

export type SbtClaim = {
    id: string;
    claim_type: string;
    trust_level: string;
    status: string;
    issuer: string;
    issued_at: string | null;
};

export type ProfileRow = {
    banned: boolean | null;
    is_frozen: boolean | null;
    freeze_reason: string | null;
} | null;

export type IdentityRow = {
    verified_at: string | null;
} | null;

export type VerifiedClaimRow = {
    claim_type: string;
    verification_status: string;
};

export type AuditRow = {
    id: string;
    state: string;
};

export type StatusCoreInputs = {
    profile: ProfileRow;
    identity: IdentityRow;
    application: AdmissionApplication | null;
    documents: AdmissionDocument[];
    consentEvents: ConsentEvent[];
    contractAcceptances: ContractAcceptance[];
    soulCredential: SoulCredential | null;
    verifiedClaims: VerifiedClaimRow[];
};

export type StatusTruthOverlayInputs = {
    openAudits: AuditRow[];
    latestAppeal: AppealRow | null;
    latestExceptionCase: ExceptionCaseRow | null;
    latestAuditSample: AuditSampleRow | null;
};

export type StatusOverlayInputs = {
    reviewCase: ReviewCase | null;
    latestSbtClaim: SbtClaim | null;
    latestDecisionRun: DecisionRun | null;
};

export type StatusTruthInputs = StatusCoreInputs & StatusTruthOverlayInputs;

export type StatusQueryResult = {
    truth: StatusTruthInputs;
    overlays: StatusOverlayInputs;
    profileError: { message: string } | null;
};

export type StatusResponseSource = Pick<StatusQueryResult, 'truth' | 'overlays'>;

export type DocumentProgress = {
    missing: string[];
    verifiedCount: number;
    totalRequired: number;
    byType: Map<string, AdmissionDocument>;
};

export type ConsentProgress = {
    consentSet: Set<string>;
    missingConsents: string[];
    consentCompleted: boolean;
};

export type ContractProgress = {
    acceptedSet: Set<string>;
    missingContracts: string[];
    contractsCompleted: boolean;
};

export type StageSignals = {
    hasIdentity: boolean;
    hasLiveness: boolean;
    consentCompleted: boolean;
    contractsCompleted: boolean;
    documentsCompleted: boolean;
    hasSoulCredential: boolean;
    hasResubmitRequest: boolean;
    hasRejectedDocument: boolean;
    hasExceptionCase: boolean;
    hasAppealOpen: boolean;
    hasAuditReview: boolean;
};

export type StatusResponse = {
    stage: AdmissionStage;
    step: AdmissionStage;
    completed: boolean;
    next: AdmissionStage;
    blockers: StatusBlockerCode[];
    details?: JsonObject;
    meta: JsonObject;
};
