import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMISSION_POLICY_VERSION } from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';
import { loadAdmissionPolicyThresholds } from '@/lib/server/admission-policy/thresholds';
import { fetchDecisionContext, markApplicationAiReviewInProgress } from '@/lib/server/admission-decision-engine/context';
import { persistDecisionRun } from '@/lib/server/admission-decision-engine/decision-run';
import { executeAdmissionDecision } from '@/lib/server/admission-decision-engine/execution';
import { runAdmissionDecisionPostCommit } from '@/lib/server/admission-decision-engine/post-commit';
import {
    buildDecisionInputSnapshot,
    resolvePolicyEvaluation,
    toPolicyDocs,
} from '@/lib/server/admission-decision-engine/policy';
import type {
    AdmissionDecisionActor,
    DecisionRunResult,
} from '@/lib/server/admission-decision-engine/types';

type RunAdmissionDecisionParams = {
    applicationId: string;
    userId: string;
    trigger: 'DOCUMENT_SUBMIT' | 'RETRY' | 'SYSTEM';
    actor?: AdmissionDecisionActor;
    executionMode?: string;
};

function resolveActor(actor?: AdmissionDecisionActor): AdmissionDecisionActor {
    return actor || {
        actorUserId: null,
        actorRole: 'AI_SYSTEM',
        source: 'AI_RULE_ENGINE',
    };
}

export async function runAdmissionDecisionEngine(
    admin: SupabaseClient,
    params: RunAdmissionDecisionParams,
): Promise<DecisionRunResult> {
    const actor = resolveActor(params.actor);
    const context = await fetchDecisionContext(admin, params.applicationId, params.userId);

    const nowIso = new Date().toISOString();
    await markApplicationAiReviewInProgress(admin, context, params.applicationId, nowIso);

    const thresholds = await loadAdmissionPolicyThresholds(admin);
    const policyEval = resolvePolicyEvaluation({
        docs: context.docs,
        hasIdentity: context.hasIdentity,
        hasLiveness: context.hasLiveness,
        missingConsents: context.missingConsents,
        thresholds,
        policyVersion: ADMISSION_POLICY_VERSION,
    });

    const policyDocs = toPolicyDocs(context.docs);
    const decisionRunId = await persistDecisionRun(admin, {
        applicationId: params.applicationId,
        userId: params.userId,
        policyEval,
        executionMode: params.executionMode || 'HOT_PATH',
        inputSnapshot: buildDecisionInputSnapshot(context, policyDocs),
    });

    const executeResult = await executeAdmissionDecision(admin, {
        applicationId: params.applicationId,
        userId: params.userId,
        decision: policyEval.finalDecision,
        reasonCode: policyEval.reasonCode,
        confidenceScore: policyEval.confidenceScore,
        anomalyFlags: policyEval.anomalyFlags,
        escalationReasonCode: policyEval.escalationReasonCode,
        decisionRunId,
        policyVersion: policyEval.policyVersion,
        resubmitDocumentTypes: policyEval.resubmitDocumentTypes,
        actor,
        auditSampleRate: policyEval.policyThresholds.auditSampleRate,
        decisionNotes: `AUTO:${policyEval.reasonCode}`,
    });

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        soulCredentialId: executeResult.soulCredentialId,
        eventType: 'ADMISSION_DECISION_RUN_RECORDED',
        payload: {
            decision_run_id: decisionRunId,
            trigger: params.trigger,
            final_decision: policyEval.finalDecision,
            reason_code: policyEval.reasonCode,
            confidence_score: policyEval.confidenceScore,
            anomaly_flags: policyEval.anomalyFlags,
            policy_version: policyEval.policyVersion,
            decided_at: nowIso,
        },
    });

    await runAdmissionDecisionPostCommit(admin, nowIso);

    return {
        decisionRunId,
        decision: policyEval.finalDecision,
        reasonCode: policyEval.reasonCode,
        applicationStatus: executeResult.applicationStatus,
        nextStep: executeResult.nextStep,
        confidenceScore: policyEval.confidenceScore,
        soulCredentialId: executeResult.soulCredentialId,
        resubmitDocumentTypes: executeResult.resubmitDocumentTypes,
        exceptionCaseId: executeResult.exceptionCaseId,
        reviewCaseId: executeResult.reviewCaseId,
        purgedCount: executeResult.purgedCount,
    };
}
