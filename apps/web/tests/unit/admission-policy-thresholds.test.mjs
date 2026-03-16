import test from 'node:test';
import assert from 'node:assert/strict';

const {
    resolveAdmissionPolicyThresholdsFromRows,
} = await import('../../lib/server/admission-policy/thresholds.ts');

test('threshold resolver falls back to defaults when rows are empty', () => {
    const resolved = resolveAdmissionPolicyThresholdsFromRows([]);
    assert.deepEqual(resolved, {
        aiConfidenceFloor: 0.68,
        exceptionConfidenceFloor: 0.45,
        hardRejectConfidenceCeiling: 0.2,
        auditSampleRate: 0.05,
    });
});

test('threshold resolver parses supported row shapes and clamps out-of-range values', () => {
    const resolved = resolveAdmissionPolicyThresholdsFromRows([
        { rule_key: 'admission.ai_confidence_floor', rule_value_json: { value: 0.61 } },
        { rule_key: 'admission.exception_confidence_floor', rule_value_json: { threshold: 0.5 } },
        { rule_key: 'admission.hard_reject_confidence_ceiling', rule_value_json: { value: -3 } },
        { rule_key: 'admission.audit_sample_rate', rule_value_json: { value: 2.2 } },
    ]);

    assert.deepEqual(resolved, {
        aiConfidenceFloor: 0.61,
        exceptionConfidenceFloor: 0.5,
        hardRejectConfidenceCeiling: 0,
        auditSampleRate: 1,
    });
});
