import { evaluateAdmissionPolicy } from '@/lib/server/admission-policy/evaluation';
import { ADMISSION_POLICY_VERSION } from '@/lib/server/admission-core';
import { executeAdmissionDecision } from '@/lib/server/admission-decision-engine/execution';
export type { AdmissionDecisionActor } from '@/lib/server/admission-decision-engine/types';

export type AdmissionDecision = 'APPROVE' | 'REJECT' | 'RESUBMIT_REQUIRED' | 'EXCEPTION_REQUIRED';

export type AutomaticDecisionEvaluation = {
    decision: AdmissionDecision;
    reasonCode: string;
    resubmitDocumentTypes: string[];
    lowConfidenceDocumentTypes: string[];
};

type AdmissionDocumentRow = {
    id: string;
    document_type: string;
    processing_status: string;
    final_result: string;
    ai_result: string | null;
    ai_confidence: number | null;
};

const COMPAT_THRESHOLDS = {
    aiConfidenceFloor: 0.68,
    exceptionConfidenceFloor: 0.45,
    hardRejectConfidenceCeiling: 0.2,
    auditSampleRate: 0.05,
};

export function evaluateAutomaticDecision(docs: AdmissionDocumentRow[]): AutomaticDecisionEvaluation {
    const evaluated = evaluateAdmissionPolicy(docs, COMPAT_THRESHOLDS, ADMISSION_POLICY_VERSION);

    return {
        decision: evaluated.finalDecision,
        reasonCode: evaluated.reasonCode,
        resubmitDocumentTypes: evaluated.resubmitDocumentTypes,
        lowConfidenceDocumentTypes: evaluated.anomalyFlags,
    };
}

export { executeAdmissionDecision };
