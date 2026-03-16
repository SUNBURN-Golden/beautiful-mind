export type OpsRefreshResult = {
    day: string;
    metrics_refreshed: boolean;
    anomalies_detected: boolean;
};

export type OpsMetricRow = Record<string, unknown> | null;

export type OpsAnomalyRow = {
    id: string;
    anomaly_type: string;
    severity: string;
    summary_json: Record<string, unknown> | null;
};

export type ExistingProposalRow = {
    id: string;
    target_rule: string;
    status: string;
    created_at: string;
};

export type ProposalRecord = Record<string, unknown>;

export type ProposalRuleConfig = {
    anomalyType: string;
    proposalType: string;
    targetRule: string;
    currentValue: Record<string, unknown>;
    proposedValue: Record<string, unknown>;
    objective: string;
};

export type DecisionRunRow = {
    id: string;
    final_decision: string;
    rule_results_json: Record<string, unknown> | null;
};

export type ShadowDecisionRow = {
    proposal_id: string;
    decision_run_id: string;
    production_decision: string;
    shadow_decision: string;
    diverged: boolean;
};

export type PolicyProposalRow = {
    id: string;
    target_rule: string;
    proposed_value: Record<string, unknown> | null;
    status: string;
};
