export type AdmissionPolicyDecision = 'APPROVE' | 'REJECT' | 'RESUBMIT_REQUIRED' | 'EXCEPTION_REQUIRED';

export type AdmissionPolicyThresholds = {
    aiConfidenceFloor: number;
    exceptionConfidenceFloor: number;
    hardRejectConfidenceCeiling: number;
    auditSampleRate: number;
};

export type AdmissionPolicyDocInput = {
    id: string;
    document_type: string;
    processing_status: string;
    final_result: string;
    ai_result: string | null;
    ai_confidence: number | null;
};

export type AdmissionPolicyEvaluation = {
    finalDecision: AdmissionPolicyDecision;
    reasonCode: string;
    confidenceScore: number;
    resubmitDocumentTypes: string[];
    anomalyFlags: string[];
    escalationReasonCode: string | null;
    ruleResults: Record<string, unknown>;
    policyVersion: string;
    policyThresholds: AdmissionPolicyThresholds;
};
