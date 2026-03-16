import { ADMISSION_POLICY_VERSION, REQUIRED_DOCUMENT_TYPES, isAdmissionDocumentType } from '../admission-core.ts';
import { POLICY_ANOMALY_FLAGS, POLICY_REASON_CODES } from './constants.ts';
import type {
    AdmissionPolicyDecision,
    AdmissionPolicyDocInput,
    AdmissionPolicyEvaluation,
    AdmissionPolicyThresholds,
} from './types.ts';

function aiHasHardRejectSignal(doc: AdmissionPolicyDocInput): boolean {
    if (!doc.ai_result) return false;
    if (doc.ai_result.includes('AUTO_REJECT')) return true;
    if (doc.ai_result.includes('FORGED')) return true;
    return false;
}

function isDocInUnprocessedState(doc: AdmissionPolicyDocInput): boolean {
    if (doc.final_result === 'RESUBMIT_REQUIRED') return false;
    if (doc.final_result === 'REJECTED') return false;
    return doc.processing_status === 'PENDING' || doc.processing_status === 'AI_PENDING';
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function buildEvaluation(params: {
    finalDecision: AdmissionPolicyDecision;
    reasonCode: string;
    confidenceScore: number;
    resubmitDocumentTypes?: string[];
    anomalyFlags?: string[];
    escalationReasonCode?: string | null;
    ruleResults: Record<string, unknown>;
    policyVersion: string;
    policyThresholds: AdmissionPolicyThresholds;
}): AdmissionPolicyEvaluation {
    return {
        finalDecision: params.finalDecision,
        reasonCode: params.reasonCode,
        confidenceScore: params.confidenceScore,
        resubmitDocumentTypes: params.resubmitDocumentTypes || [],
        anomalyFlags: params.anomalyFlags || [],
        escalationReasonCode: params.escalationReasonCode ?? null,
        policyVersion: params.policyVersion,
        policyThresholds: params.policyThresholds,
        ruleResults: params.ruleResults,
    };
}

function collectRequiredDocsByType(
    docs: AdmissionPolicyDocInput[],
): {
    requiredDocs: AdmissionPolicyDocInput[];
    missingRequiredDocumentTypes: string[];
} {
    const byType = new Map<string, AdmissionPolicyDocInput>();
    for (const row of docs) {
        if (!isAdmissionDocumentType(row.document_type)) continue;
        byType.set(row.document_type, row);
    }

    const missingRequiredDocumentTypes = REQUIRED_DOCUMENT_TYPES.filter((type) => !byType.has(type));
    const requiredDocs = REQUIRED_DOCUMENT_TYPES
        .map((type) => byType.get(type))
        .filter((row): row is AdmissionPolicyDocInput => Boolean(row));

    return {
        requiredDocs,
        missingRequiredDocumentTypes,
    };
}

export function evaluateAdmissionPolicy(
    docs: AdmissionPolicyDocInput[],
    thresholds: AdmissionPolicyThresholds,
    policyVersion = ADMISSION_POLICY_VERSION,
): AdmissionPolicyEvaluation {
    const {
        requiredDocs,
        missingRequiredDocumentTypes,
    } = collectRequiredDocsByType(docs);

    // Rule 1: all required documents must exist.
    if (missingRequiredDocumentTypes.length > 0) {
        return buildEvaluation({
            finalDecision: 'RESUBMIT_REQUIRED',
            reasonCode: POLICY_REASON_CODES.MISSING_REQUIRED_DOCUMENTS,
            confidenceScore: 0,
            resubmitDocumentTypes: missingRequiredDocumentTypes,
            ruleResults: {
                required_documents_complete: false,
                missing_required_documents: missingRequiredDocumentTypes,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 2: explicit reject outcomes dominate.
    const rejectedDocs = requiredDocs.filter((doc) => doc.final_result === 'REJECTED');
    if (rejectedDocs.length > 0) {
        return buildEvaluation({
            finalDecision: 'REJECT',
            reasonCode: POLICY_REASON_CODES.DOCUMENT_REJECTED,
            confidenceScore: 0,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.REJECTED_DOCUMENT_EXISTS],
            ruleResults: {
                rejected_document_types: rejectedDocs.map((doc) => doc.document_type),
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 3: explicit resubmit markers force resubmit.
    const resubmitRequested = requiredDocs.filter((doc) => (
        doc.final_result === 'RESUBMIT_REQUIRED' || doc.processing_status === 'RESUBMIT_REQUIRED'
    ));

    if (resubmitRequested.length > 0) {
        return buildEvaluation({
            finalDecision: 'RESUBMIT_REQUIRED',
            reasonCode: POLICY_REASON_CODES.DOCS_FLAGGED_FOR_RESUBMIT,
            confidenceScore: 0,
            resubmitDocumentTypes: resubmitRequested.map((doc) => doc.document_type),
            ruleResults: {
                resubmit_document_types: resubmitRequested.map((doc) => doc.document_type),
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 4: processing must be complete before confidence-based decisions.
    const unprocessedDocs = requiredDocs.filter(isDocInUnprocessedState);
    if (unprocessedDocs.length > 0) {
        return buildEvaluation({
            finalDecision: 'RESUBMIT_REQUIRED',
            reasonCode: POLICY_REASON_CODES.AI_PROCESSING_INCOMPLETE,
            confidenceScore: 0,
            resubmitDocumentTypes: unprocessedDocs.map((doc) => doc.document_type),
            ruleResults: {
                ai_processing_incomplete: true,
                pending_document_types: unprocessedDocs.map((doc) => doc.document_type),
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 5: explicit hard-reject signals below ceiling reject immediately.
    const hardRejectDoc = requiredDocs.find((doc) => (
        aiHasHardRejectSignal(doc)
        && typeof doc.ai_confidence === 'number'
        && doc.ai_confidence <= thresholds.hardRejectConfidenceCeiling
    ));

    if (hardRejectDoc) {
        return buildEvaluation({
            finalDecision: 'REJECT',
            reasonCode: POLICY_REASON_CODES.AI_HARD_REJECT_SIGNAL,
            confidenceScore: hardRejectDoc.ai_confidence || 0,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.HARD_REJECT_SIGNAL],
            ruleResults: {
                hard_reject_document_type: hardRejectDoc.document_type,
                hard_reject_confidence: hardRejectDoc.ai_confidence,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    const confidenceByType = requiredDocs.map((doc) => ({
        document_type: doc.document_type,
        confidence: typeof doc.ai_confidence === 'number' ? doc.ai_confidence : null,
    }));

    // Rule 6: missing confidence becomes exception review.
    const missingConfidenceDocumentTypes = confidenceByType
        .filter((row) => typeof row.confidence !== 'number')
        .map((row) => row.document_type);

    if (missingConfidenceDocumentTypes.length > 0) {
        return buildEvaluation({
            finalDecision: 'EXCEPTION_REQUIRED',
            reasonCode: POLICY_REASON_CODES.AI_CONFIDENCE_MISSING,
            confidenceScore: 0,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.CONFIDENCE_MISSING],
            escalationReasonCode: POLICY_REASON_CODES.AI_CONFIDENCE_MISSING,
            ruleResults: {
                confidence_missing_document_types: missingConfidenceDocumentTypes,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    const confidences = confidenceByType
        .map((row) => row.confidence)
        .filter((value): value is number => typeof value === 'number');

    const minConfidence = Math.min(...confidences);
    const avgConfidence = average(confidences);

    const conflictSignalDocs = requiredDocs.filter((doc) => (
        typeof doc.ai_result === 'string' && (doc.ai_result.includes('CONFLICT:') || doc.ai_result.includes('ANOMALY:'))
    ));

    // Rule 7: conflict/anomaly markers go to exception review.
    if (conflictSignalDocs.length > 0) {
        return buildEvaluation({
            finalDecision: 'EXCEPTION_REQUIRED',
            reasonCode: POLICY_REASON_CODES.CROSS_DOCUMENT_CONFLICT,
            confidenceScore: avgConfidence,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.CROSS_DOCUMENT_CONFLICT],
            escalationReasonCode: POLICY_REASON_CODES.CROSS_DOCUMENT_CONFLICT,
            ruleResults: {
                conflict_document_types: conflictSignalDocs.map((doc) => doc.document_type),
                min_confidence: minConfidence,
                avg_confidence: avgConfidence,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 8: very low confidence rejects.
    if (minConfidence <= thresholds.hardRejectConfidenceCeiling) {
        return buildEvaluation({
            finalDecision: 'REJECT',
            reasonCode: POLICY_REASON_CODES.VERY_LOW_CONFIDENCE,
            confidenceScore: minConfidence,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.VERY_LOW_CONFIDENCE],
            ruleResults: {
                min_confidence: minConfidence,
                avg_confidence: avgConfidence,
                hard_reject_ceiling: thresholds.hardRejectConfidenceCeiling,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 9: low confidence review band escalates to exception review.
    if (minConfidence < thresholds.exceptionConfidenceFloor) {
        return buildEvaluation({
            finalDecision: 'EXCEPTION_REQUIRED',
            reasonCode: POLICY_REASON_CODES.LOW_CONFIDENCE_EXCEPTION,
            confidenceScore: minConfidence,
            anomalyFlags: [POLICY_ANOMALY_FLAGS.LOW_CONFIDENCE_EXCEPTION],
            escalationReasonCode: POLICY_REASON_CODES.LOW_CONFIDENCE_EXCEPTION,
            ruleResults: {
                min_confidence: minConfidence,
                avg_confidence: avgConfidence,
                exception_confidence_floor: thresholds.exceptionConfidenceFloor,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 10: sub-approval band resubmits specific docs.
    const resubmitLowConfidence = confidenceByType
        .filter((row) => typeof row.confidence === 'number' && row.confidence < thresholds.aiConfidenceFloor)
        .map((row) => row.document_type);

    if (resubmitLowConfidence.length > 0) {
        return buildEvaluation({
            finalDecision: 'RESUBMIT_REQUIRED',
            reasonCode: POLICY_REASON_CODES.LOW_CONFIDENCE_RESUBMIT,
            confidenceScore: minConfidence,
            resubmitDocumentTypes: resubmitLowConfidence,
            ruleResults: {
                low_confidence_document_types: resubmitLowConfidence,
                ai_confidence_floor: thresholds.aiConfidenceFloor,
                min_confidence: minConfidence,
                avg_confidence: avgConfidence,
            },
            policyVersion,
            policyThresholds: thresholds,
        });
    }

    // Rule 11: all checks passed -> approve.
    return buildEvaluation({
        finalDecision: 'APPROVE',
        reasonCode: POLICY_REASON_CODES.AI_RULES_APPROVED,
        confidenceScore: avgConfidence,
        ruleResults: {
            required_documents_complete: true,
            min_confidence: minConfidence,
            avg_confidence: avgConfidence,
            ai_confidence_floor: thresholds.aiConfidenceFloor,
        },
        policyVersion,
        policyThresholds: thresholds,
    });
}
