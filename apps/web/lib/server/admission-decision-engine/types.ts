import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AdmissionPolicyDecision,
    AdmissionPolicyDocInput,
    AdmissionPolicyEvaluation,
    AdmissionPolicyThresholds,
} from '../admission-policy.ts';

export type AdmissionDecisionActor = {
    actorUserId: string | null;
    actorRole: 'AI_SYSTEM' | 'ADMIN' | 'CRON' | 'POLICY_ENGINE';
    source: 'AI_RULE_ENGINE' | 'APPEAL_REVIEW' | 'EXCEPTION_REVIEW' | 'AUDIT_REVIEW' | 'POLICY_OVERRIDE';
};

export type AdmissionApplicationRow = {
    id: string;
    user_id: string;
    status: string;
    current_step: string;
    policy_version: string | null;
    liveness_verified_at: string | null;
    submitted_at: string | null;
    ai_review_started_at: string | null;
};

export type AdmissionDocumentRow = {
    id: string;
    document_type: string;
    upload_status: string;
    processing_status: string;
    final_result: string;
    ai_result: string | null;
    ai_confidence: number | null;
    file_storage_key_ephemeral: string | null;
    extracted_claims_json: Record<string, unknown> | null;
};

export type AdmissionDecisionContext = {
    application: AdmissionApplicationRow;
    docs: AdmissionDocumentRow[];
    hasIdentity: boolean;
    hasLiveness: boolean;
    missingConsents: string[];
};

export type DecisionRunResult = {
    decisionRunId: string;
    decision: AdmissionPolicyDecision;
    reasonCode: string;
    applicationStatus: string;
    nextStep: string;
    confidenceScore: number;
    soulCredentialId: string | null;
    resubmitDocumentTypes: string[];
    exceptionCaseId: string | null;
    reviewCaseId: string | null;
    purgedCount: number;
};

export type ExecuteAdmissionDecisionParams = {
    applicationId: string;
    userId: string;
    decision: AdmissionPolicyDecision;
    reasonCode: string;
    confidenceScore: number;
    anomalyFlags: string[];
    escalationReasonCode: string | null;
    decisionRunId: string;
    policyVersion?: string;
    resubmitDocumentTypes?: string[];
    actor: AdmissionDecisionActor;
    auditSampleRate?: number;
    decisionNotes?: string;
};

export type ExecuteAdmissionDecisionResult = {
    applicationStatus: string;
    nextStep: string;
    soulCredentialId: string | null;
    exceptionCaseId: string | null;
    reviewCaseId: string | null;
    purgedCount: number;
    resubmitDocumentTypes: string[];
};

export type PersistDecisionRunParams = {
    applicationId: string;
    userId: string;
    policyEval: AdmissionPolicyEvaluation;
    executionMode: string;
    inputSnapshot: Record<string, unknown>;
};

export type ResolvePolicyEvaluationParams = {
    docs: AdmissionDocumentRow[];
    hasIdentity: boolean;
    hasLiveness: boolean;
    missingConsents: string[];
    thresholds: AdmissionPolicyThresholds;
    policyVersion: string;
};

export type PolicyEvaluator = (
    docs: AdmissionPolicyDocInput[],
    thresholds: AdmissionPolicyThresholds,
    policyVersion?: string,
) => AdmissionPolicyEvaluation;

export type AdminClient = SupabaseClient;
