import { createHash } from 'crypto';
import { REQUIRED_DOCUMENT_TYPES } from '../admission-core.ts';
import { STATUS_BLOCKER_CODES } from '../../contracts/status-codes.ts';
import { STATUS_DECISION_REASON_CODES } from '../../contracts/status-reasons.ts';
import type { AdmissionPolicyDocInput, AdmissionPolicyEvaluation, AdmissionPolicyThresholds } from '../admission-policy.ts';
import { evaluateAdmissionPolicy } from '../admission-policy.ts';
import type { AdmissionDecisionContext, AdmissionDocumentRow, PolicyEvaluator, ResolvePolicyEvaluationParams } from './types';

export function toPolicyDocs(rows: AdmissionDocumentRow[]): AdmissionPolicyDocInput[] {
    return rows.map((row) => ({
        id: row.id,
        document_type: row.document_type,
        processing_status: row.processing_status,
        final_result: row.final_result,
        ai_result: row.ai_result,
        ai_confidence: row.ai_confidence,
    }));
}

export function buildDecisionInputSnapshotHash(payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function buildDecisionInputSnapshot(
    context: AdmissionDecisionContext,
    policyDocs: AdmissionPolicyDocInput[],
): Record<string, unknown> {
    return {
        user_id: context.application.user_id,
        application_id: context.application.id,
        application_status: context.application.status,
        application_step: context.application.current_step,
        has_identity: context.hasIdentity,
        has_liveness: context.hasLiveness,
        missing_consents: context.missingConsents,
        docs: policyDocs,
    };
}

export function resolvePolicyEvaluation(
    params: ResolvePolicyEvaluationParams,
    evaluator: PolicyEvaluator = evaluateAdmissionPolicy,
): AdmissionPolicyEvaluation {
    const policyDocs = toPolicyDocs(params.docs);
    if (!params.hasIdentity || !params.hasLiveness || params.missingConsents.length > 0) {
        const missingSteps: string[] = [];
        if (!params.hasIdentity) missingSteps.push(STATUS_BLOCKER_CODES.IDENTITY_REQUIRED);
        if (!params.hasLiveness) missingSteps.push(STATUS_BLOCKER_CODES.LIVENESS_REQUIRED);
        if (params.missingConsents.length > 0) missingSteps.push(STATUS_BLOCKER_CODES.CONSENTS_REQUIRED);

        return {
            finalDecision: 'RESUBMIT_REQUIRED',
            reasonCode: STATUS_DECISION_REASON_CODES.PRECONDITION_INCOMPLETE,
            confidenceScore: 0,
            resubmitDocumentTypes: [...REQUIRED_DOCUMENT_TYPES],
            anomalyFlags: missingSteps,
            escalationReasonCode: null,
            policyVersion: params.policyVersion,
            policyThresholds: params.thresholds,
            ruleResults: {
                precondition_complete: false,
                missing_steps: missingSteps,
                missing_consents: params.missingConsents,
            },
        };
    }

    return evaluator(policyDocs, params.thresholds, params.policyVersion);
}

export function extractDecisionDocumentTypes(
    policyEval: AdmissionPolicyEvaluation,
    fallback: string[] = [...REQUIRED_DOCUMENT_TYPES],
): string[] {
    return policyEval.resubmitDocumentTypes.length > 0
        ? [...policyEval.resubmitDocumentTypes]
        : fallback;
}

export function isDecisionTerminal(decision: AdmissionPolicyEvaluation['finalDecision']): boolean {
    return decision === 'APPROVE' || decision === 'REJECT';
}

export type { AdmissionPolicyThresholds };
