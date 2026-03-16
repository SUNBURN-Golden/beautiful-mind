import type { SupabaseClient } from '@supabase/supabase-js';
import { buildDayRange } from './config.ts';
import type {
    ExistingProposalRow,
    OpsAnomalyRow,
    OpsMetricRow,
    PolicyProposalRow,
    ProposalRecord,
    ShadowDecisionRow,
} from './types.ts';

export async function runDailyMetricAggregation(admin: SupabaseClient, day: string): Promise<void> {
    const { error: metricError } = await admin.rpc('refresh_admission_ops_metrics_daily', {
        p_day: day,
    });
    if (metricError) {
        throw new Error(`refresh_admission_ops_metrics_daily failed: ${metricError.message}`);
    }
}

export async function runDailyAnomalyDetection(admin: SupabaseClient, day: string): Promise<void> {
    const { error: anomalyError } = await admin.rpc('detect_admission_ops_anomalies', {
        p_day: day,
    });
    if (anomalyError) {
        throw new Error(`detect_admission_ops_anomalies failed: ${anomalyError.message}`);
    }
}

export async function loadProposalInputs(admin: SupabaseClient, day: string): Promise<{
    metrics: OpsMetricRow;
    anomalies: OpsAnomalyRow[];
    existing: ExistingProposalRow[];
}> {
    const dayRange = buildDayRange(day);
    const [{ data: metrics }, { data: anomalies }, { data: existing }] = await Promise.all([
        admin
            .from('admission_ops_metrics_daily')
            .select('*')
            .eq('day', day)
            .maybeSingle(),
        admin
            .from('admission_ops_anomalies')
            .select('id,anomaly_type,severity,summary_json')
            .eq('day', day)
            .is('resolved_at', null),
        admin
            .from('policy_change_proposals')
            .select('id,target_rule,status,created_at')
            .gte('created_at', dayRange.start)
            .lt('created_at', dayRange.end),
    ]);

    return {
        metrics: metrics || null,
        anomalies: (anomalies || []) as OpsAnomalyRow[],
        existing: (existing || []) as ExistingProposalRow[],
    };
}

export async function insertPolicyChangeProposals(
    admin: SupabaseClient,
    inserts: ProposalRecord[],
): Promise<void> {
    const { error } = await admin.from('policy_change_proposals').insert(inserts);
    if (error) {
        throw new Error(`policy_change_proposals insert failed: ${error.message}`);
    }
}

export async function loadPolicyProposalForSimulation(
    admin: SupabaseClient,
    proposalId: string,
): Promise<PolicyProposalRow> {
    const { data: proposal, error: proposalError } = await admin
        .from('policy_change_proposals')
        .select('id,target_rule,proposed_value,status')
        .eq('id', proposalId)
        .maybeSingle();

    if (proposalError || !proposal) {
        throw new Error(proposalError?.message || 'Proposal not found');
    }

    return proposal as PolicyProposalRow;
}

export async function loadDecisionRunsForSimulation(
    admin: SupabaseClient,
    sampleSize: number,
): Promise<Array<{ id: string; final_decision: string; rule_results_json: Record<string, unknown> | null }>> {
    const { data: runs, error: runsError } = await admin
        .from('admission_decision_runs')
        .select('id,final_decision,rule_results_json')
        .order('created_at', { ascending: false })
        .limit(sampleSize);

    if (runsError) {
        throw new Error(runsError.message);
    }

    return (runs || []) as Array<{ id: string; final_decision: string; rule_results_json: Record<string, unknown> | null }>;
}

export async function replacePolicyShadowRuns(
    admin: SupabaseClient,
    proposalId: string,
    rows: ShadowDecisionRow[],
): Promise<void> {
    await admin
        .from('policy_shadow_runs')
        .delete()
        .eq('proposal_id', proposalId);

    if (rows.length > 0) {
        const { error: insertError } = await admin
            .from('policy_shadow_runs')
            .insert(rows);

        if (insertError) {
            throw new Error(insertError.message);
        }
    }
}

export async function updatePolicyProposalSimulationResult(
    admin: SupabaseClient,
    params: {
        proposalId: string;
        evaluated: number;
        diverged: number;
        divergenceRate: number;
    },
): Promise<void> {
    const { error: updateError } = await admin
        .from('policy_change_proposals')
        .update({
            status: 'SIMULATED',
            simulation_result_json: {
                evaluated: params.evaluated,
                diverged: params.diverged,
                divergence_rate: params.divergenceRate,
                simulated_at: new Date().toISOString(),
            },
        })
        .eq('id', params.proposalId);

    if (updateError) {
        throw new Error(updateError.message);
    }
}
