import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_POLICY_THRESHOLDS, POLICY_RULE_KEYS } from './constants.ts';
import type { AdmissionPolicyThresholds } from './types.ts';

type PolicyRuleRow = {
    rule_key: string;
    rule_value_json: unknown;
    is_active?: boolean;
};

function clampRate(value: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function extractNumericRuleValue(raw: unknown): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (!raw || typeof raw !== 'object') return null;

    const obj = raw as Record<string, unknown>;
    if (typeof obj.value === 'number' && Number.isFinite(obj.value)) {
        return obj.value;
    }
    if (typeof obj.threshold === 'number' && Number.isFinite(obj.threshold)) {
        return obj.threshold;
    }
    return null;
}

export function resolveAdmissionPolicyThresholdsFromRows(rows: PolicyRuleRow[]): AdmissionPolicyThresholds {
    if (!Array.isArray(rows) || rows.length === 0) {
        return DEFAULT_POLICY_THRESHOLDS;
    }

    const byKey = new Map<string, unknown>();
    for (const row of rows) {
        byKey.set(row.rule_key, row.rule_value_json);
    }

    return {
        aiConfidenceFloor: clampRate(
            extractNumericRuleValue(byKey.get(POLICY_RULE_KEYS.aiConfidenceFloor)) ?? DEFAULT_POLICY_THRESHOLDS.aiConfidenceFloor,
            DEFAULT_POLICY_THRESHOLDS.aiConfidenceFloor,
        ),
        exceptionConfidenceFloor: clampRate(
            extractNumericRuleValue(byKey.get(POLICY_RULE_KEYS.exceptionConfidenceFloor)) ?? DEFAULT_POLICY_THRESHOLDS.exceptionConfidenceFloor,
            DEFAULT_POLICY_THRESHOLDS.exceptionConfidenceFloor,
        ),
        hardRejectConfidenceCeiling: clampRate(
            extractNumericRuleValue(byKey.get(POLICY_RULE_KEYS.hardRejectConfidenceCeiling)) ?? DEFAULT_POLICY_THRESHOLDS.hardRejectConfidenceCeiling,
            DEFAULT_POLICY_THRESHOLDS.hardRejectConfidenceCeiling,
        ),
        auditSampleRate: clampRate(
            extractNumericRuleValue(byKey.get(POLICY_RULE_KEYS.auditSampleRate)) ?? DEFAULT_POLICY_THRESHOLDS.auditSampleRate,
            DEFAULT_POLICY_THRESHOLDS.auditSampleRate,
        ),
    };
}

export async function loadAdmissionPolicyThresholds(admin: SupabaseClient): Promise<AdmissionPolicyThresholds> {
    const { data, error } = await admin
        .from('policy_rules')
        .select('rule_key,rule_value_json,is_active')
        .eq('is_active', true)
        .in('rule_key', [
            POLICY_RULE_KEYS.aiConfidenceFloor,
            POLICY_RULE_KEYS.exceptionConfidenceFloor,
            POLICY_RULE_KEYS.hardRejectConfidenceCeiling,
            POLICY_RULE_KEYS.auditSampleRate,
        ]);

    if (error || !Array.isArray(data) || data.length === 0) {
        return DEFAULT_POLICY_THRESHOLDS;
    }

    return resolveAdmissionPolicyThresholdsFromRows(data as PolicyRuleRow[]);
}
