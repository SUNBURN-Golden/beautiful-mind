import type { AdminClient, PersistDecisionRunParams } from './types';
import { buildDecisionInputSnapshotHash } from './policy';

export async function persistDecisionRun(
    admin: AdminClient,
    params: PersistDecisionRunParams,
): Promise<string> {
    const snapshotHash = buildDecisionInputSnapshotHash(params.inputSnapshot);

    const { data, error } = await admin
        .from('admission_decision_runs')
        .insert({
            admission_application_id: params.applicationId,
            user_id: params.userId,
            decision_type: params.policyEval.finalDecision,
            ai_model_name: 'soulbound-rule-hybrid',
            ai_model_version: '2026-03-07',
            policy_version: params.policyEval.policyVersion,
            input_snapshot_hash: snapshotHash,
            rule_results_json: params.policyEval.ruleResults,
            ai_outputs_json: {
                reason_code: params.policyEval.reasonCode,
                confidence_score: params.policyEval.confidenceScore,
                anomaly_flags: params.policyEval.anomalyFlags,
                resubmit_document_types: params.policyEval.resubmitDocumentTypes,
                policy_thresholds: params.policyEval.policyThresholds,
                decision_latency_ms: 0,
            },
            final_decision: params.policyEval.finalDecision,
            confidence_score: params.policyEval.confidenceScore,
            anomaly_flags_json: params.policyEval.anomalyFlags,
            escalation_reason_code: params.policyEval.escalationReasonCode,
            execution_mode: params.executionMode,
        })
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to create admission decision run');
    }

    return data.id;
}
