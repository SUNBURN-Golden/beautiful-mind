import type { AdmissionPolicyThresholds } from './types.ts';
import { STATUS_DECISION_REASON_CODES } from '../../contracts/status-reasons.ts';

export const POLICY_RULE_KEYS = {
    aiConfidenceFloor: 'admission.ai_confidence_floor',
    exceptionConfidenceFloor: 'admission.exception_confidence_floor',
    hardRejectConfidenceCeiling: 'admission.hard_reject_confidence_ceiling',
    auditSampleRate: 'admission.audit_sample_rate',
} as const;

export const POLICY_REASON_CODES = STATUS_DECISION_REASON_CODES;

export const POLICY_ANOMALY_FLAGS = {
    REJECTED_DOCUMENT_EXISTS: 'REJECTED_DOCUMENT_EXISTS',
    HARD_REJECT_SIGNAL: 'HARD_REJECT_SIGNAL',
    CONFIDENCE_MISSING: 'CONFIDENCE_MISSING',
    CROSS_DOCUMENT_CONFLICT: 'CROSS_DOCUMENT_CONFLICT',
    VERY_LOW_CONFIDENCE: 'VERY_LOW_CONFIDENCE',
    LOW_CONFIDENCE_EXCEPTION: 'LOW_CONFIDENCE_EXCEPTION',
} as const;

export const DEFAULT_POLICY_THRESHOLDS: AdmissionPolicyThresholds = {
    aiConfidenceFloor: 0.68,
    exceptionConfidenceFloor: 0.45,
    hardRejectConfidenceCeiling: 0.2,
    auditSampleRate: 0.05,
};
