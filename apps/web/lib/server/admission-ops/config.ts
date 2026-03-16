import type { ProposalRuleConfig } from './types.ts';

export const OPS_RULE_KEYS = {
    aiConfidenceFloor: 'admission.ai_confidence_floor',
    exceptionConfidenceFloor: 'admission.exception_confidence_floor',
    auditSampleRate: 'admission.audit_sample_rate',
} as const;

export const OPS_RUNTIME_CONFIG: {
    defaultSampleSize: number;
    divergencePrecision: number;
    exceptionSimulationHardRejectCeiling: number;
} = {
    defaultSampleSize: 300,
    divergencePrecision: 4,
    exceptionSimulationHardRejectCeiling: 0.2,
};

export const PROPOSAL_RULES: readonly ProposalRuleConfig[] = [
    {
        anomalyType: 'LOW_CONFIDENCE_SPIKE',
        proposalType: 'THRESHOLD_TUNING',
        targetRule: OPS_RULE_KEYS.aiConfidenceFloor,
        currentValue: { value: 0.68 },
        proposedValue: { value: 0.65 },
        objective: 'Reduce false resubmit caused by confidence concentration near the floor.',
    },
    {
        anomalyType: 'APPEAL_OVERTURN_SPIKE',
        proposalType: 'THRESHOLD_TUNING',
        targetRule: OPS_RULE_KEYS.exceptionConfidenceFloor,
        currentValue: { value: 0.45 },
        proposedValue: { value: 0.5 },
        objective: 'Route more ambiguous cases to exception queue to reduce false reject.',
    },
    {
        anomalyType: 'RESUBMIT_SURGE',
        proposalType: 'SAMPLING_TUNING',
        targetRule: OPS_RULE_KEYS.auditSampleRate,
        currentValue: { value: 0.05 },
        proposedValue: { value: 0.08 },
        objective: 'Increase audit samples temporarily while resubmit surge is investigated.',
    },
    {
        anomalyType: 'PURGE_FAILURE',
        proposalType: 'OPS_GUARD',
        targetRule: 'ops.purge_reliability_guard',
        currentValue: { max_failures: 0 },
        proposedValue: { max_failures: 0, retry_window_minutes: 10 },
        objective: 'Strengthen purge retry and alarm path after purge failures.',
    },
] as const;

export function toIsoDay(day = new Date()): string {
    return day.toISOString().slice(0, 10);
}

export function buildDayRange(day: string) {
    return {
        start: `${day}T00:00:00.000Z`,
        end: `${day}T23:59:59.999Z`,
    };
}
