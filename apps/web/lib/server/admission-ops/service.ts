import type { SupabaseClient } from '@supabase/supabase-js';
import { OPS_RULE_KEYS, OPS_RUNTIME_CONFIG, toIsoDay } from './config.ts';
import {
    buildPolicyProposalCandidates,
    buildPolicyShadowRows,
    getCandidateThreshold,
    summarizeShadowRows,
} from './pure.ts';
import {
    insertPolicyChangeProposals,
    loadDecisionRunsForSimulation,
    loadPolicyProposalForSimulation,
    loadProposalInputs,
    replacePolicyShadowRuns,
    runDailyAnomalyDetection,
    runDailyMetricAggregation,
    updatePolicyProposalSimulationResult,
} from './store.ts';
import type { OpsRefreshResult } from './types.ts';

export async function refreshAdmissionOpsForDay(
    admin: SupabaseClient,
    targetDay?: string,
): Promise<OpsRefreshResult> {
    const day = targetDay || toIsoDay();
    await runDailyMetricAggregation(admin, day);
    await runDailyAnomalyDetection(admin, day);

    return {
        day,
        metrics_refreshed: true,
        anomalies_detected: true,
    };
}

export async function generatePolicyChangeProposals(
    admin: SupabaseClient,
    targetDay?: string,
): Promise<{ day: string; created: number }> {
    const day = targetDay || toIsoDay();
    const { metrics, anomalies, existing } = await loadProposalInputs(admin, day);
    const existingRules = new Set(existing.map((row) => row.target_rule));
    const inserts = buildPolicyProposalCandidates({
        day,
        metrics,
        anomalies,
        existingRules,
    });

    if (inserts.length === 0) {
        return { day, created: 0 };
    }

    await insertPolicyChangeProposals(admin, inserts);
    return { day, created: inserts.length };
}

export async function simulatePolicyProposal(
    admin: SupabaseClient,
    proposalId: string,
    sampleSize = OPS_RUNTIME_CONFIG.defaultSampleSize,
): Promise<{ evaluated: number; diverged: number; divergenceRate: number }> {
    const proposal = await loadPolicyProposalForSimulation(admin, proposalId);

    const candidateThreshold = getCandidateThreshold(proposal);
    if (candidateThreshold === null && proposal.target_rule !== OPS_RULE_KEYS.auditSampleRate) {
        throw new Error('Proposal has no numeric threshold to simulate');
    }

    const runs = await loadDecisionRunsForSimulation(admin, sampleSize);

    const shadowRows = buildPolicyShadowRows({
        proposalId: proposal.id,
        targetRule: proposal.target_rule,
        candidateThreshold: candidateThreshold ?? 0,
        runs,
    });
    const summary = summarizeShadowRows(shadowRows);

    await replacePolicyShadowRuns(admin, proposal.id, shadowRows);

    await updatePolicyProposalSimulationResult(admin, {
        proposalId: proposal.id,
        evaluated: summary.evaluated,
        diverged: summary.diverged,
        divergenceRate: summary.divergenceRate,
    });

    return summary;
}
