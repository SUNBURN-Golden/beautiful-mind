import { OPS_RULE_KEYS, OPS_RUNTIME_CONFIG, PROPOSAL_RULES } from './config.ts';
import type {
    DecisionRunRow,
    OpsAnomalyRow,
    OpsMetricRow,
    ProposalRecord,
    ProposalRuleConfig,
    ShadowDecisionRow,
} from './types.ts';

function asNumeric(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function findProposalRule(anomalyType: string): ProposalRuleConfig | null {
    return PROPOSAL_RULES.find((rule) => rule.anomalyType === anomalyType) || null;
}

export function buildPolicyProposalCandidates(params: {
    day: string;
    metrics: OpsMetricRow;
    anomalies: OpsAnomalyRow[];
    existingRules: Set<string>;
}): ProposalRecord[] {
    const inserts: ProposalRecord[] = [];
    const claimedRules = new Set(params.existingRules);

    for (const anomaly of params.anomalies) {
        const rule = findProposalRule(anomaly.anomaly_type);
        if (!rule || claimedRules.has(rule.targetRule)) {
            continue;
        }

        inserts.push({
            proposal_type: rule.proposalType,
            target_rule: rule.targetRule,
            current_value: rule.currentValue,
            proposed_value: rule.proposedValue,
            rationale_json: {
                anomaly_type: anomaly.anomaly_type,
                summary: anomaly.summary_json,
                objective: rule.objective,
            },
            based_on_metrics_json: params.metrics || {},
            status: 'DRAFT',
        });
        claimedRules.add(rule.targetRule);
    }

    return inserts;
}

export function getCandidateThreshold(
    proposal: {
        target_rule: string;
        proposed_value: Record<string, unknown> | null;
    },
): number | null {
    const raw = proposal.proposed_value || {};
    if (typeof raw !== 'object') return null;

    const value = asNumeric((raw as Record<string, unknown>).value, Number.NaN);
    if (Number.isFinite(value)) {
        return value;
    }
    return null;
}

export function extractMinConfidence(ruleResults: Record<string, unknown> | null): number | null {
    const minConfidenceRaw = (ruleResults || {}).min_confidence;
    if (typeof minConfidenceRaw === 'number' && Number.isFinite(minConfidenceRaw)) {
        return minConfidenceRaw;
    }
    if (typeof minConfidenceRaw === 'string') {
        const parsed = Number.parseFloat(minConfidenceRaw);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

export function simulateDecisionWithThreshold(
    productionDecision: string,
    minConfidence: number | null,
    ruleKey: string,
    threshold: number,
): string {
    if (minConfidence === null) {
        return productionDecision;
    }

    if (ruleKey === OPS_RULE_KEYS.aiConfidenceFloor) {
        if (productionDecision === 'APPROVE' || productionDecision === 'RESUBMIT_REQUIRED') {
            return minConfidence < threshold ? 'RESUBMIT_REQUIRED' : 'APPROVE';
        }
    }

    if (ruleKey === OPS_RULE_KEYS.exceptionConfidenceFloor) {
        if (
            minConfidence < threshold
            && minConfidence > OPS_RUNTIME_CONFIG.exceptionSimulationHardRejectCeiling
        ) {
            return 'EXCEPTION_REQUIRED';
        }
    }

    if (ruleKey === OPS_RULE_KEYS.auditSampleRate) {
        return productionDecision;
    }

    return productionDecision;
}

export function buildPolicyShadowRows(params: {
    proposalId: string;
    targetRule: string;
    candidateThreshold: number;
    runs: DecisionRunRow[];
}): ShadowDecisionRow[] {
    return params.runs.map((run) => {
        const minConfidence = extractMinConfidence(run.rule_results_json);
        const shadowDecision = simulateDecisionWithThreshold(
            run.final_decision,
            minConfidence,
            params.targetRule,
            params.candidateThreshold,
        );

        return {
            proposal_id: params.proposalId,
            decision_run_id: run.id,
            production_decision: run.final_decision,
            shadow_decision: shadowDecision,
            diverged: shadowDecision !== run.final_decision,
        };
    });
}

export function summarizeShadowRows(rows: Array<{ diverged: boolean }>): {
    evaluated: number;
    diverged: number;
    divergenceRate: number;
} {
    const diverged = rows.filter((row) => row.diverged).length;
    const evaluated = rows.length;
    const divergenceRate = evaluated > 0
        ? Number((diverged / evaluated).toFixed(OPS_RUNTIME_CONFIG.divergencePrecision))
        : 0;
    return { evaluated, diverged, divergenceRate };
}
