import assert from 'node:assert/strict';
import test from 'node:test';

const {
    buildPolicyProposalCandidates,
    extractMinConfidence,
    getCandidateThreshold,
    simulateDecisionWithThreshold,
    buildPolicyShadowRows,
    summarizeShadowRows,
} = await import('../../lib/server/admission-ops.ts');

test('buildPolicyProposalCandidates maps anomalies to one proposal per target rule', () => {
    const proposals = buildPolicyProposalCandidates({
        day: '2026-03-10',
        metrics: { low_confidence_rate: 0.33 },
        anomalies: [
            { id: 'a1', anomaly_type: 'LOW_CONFIDENCE_SPIKE', severity: 'HIGH', summary_json: { bucket: '0.6-0.7' } },
            { id: 'a2', anomaly_type: 'LOW_CONFIDENCE_SPIKE', severity: 'HIGH', summary_json: { bucket: '0.5-0.6' } },
            { id: 'a3', anomaly_type: 'RESUBMIT_SURGE', severity: 'MEDIUM', summary_json: { ratio: 0.42 } },
            { id: 'a4', anomaly_type: 'UNKNOWN', severity: 'LOW', summary_json: {} },
        ],
        existingRules: new Set(),
    });

    assert.equal(proposals.length, 2);
    assert.equal(proposals[0].target_rule, 'admission.ai_confidence_floor');
    assert.equal(proposals[1].target_rule, 'admission.audit_sample_rate');
    assert.equal((proposals[0].based_on_metrics_json).low_confidence_rate, 0.33);
});

test('buildPolicyProposalCandidates skips already proposed target rules', () => {
    const proposals = buildPolicyProposalCandidates({
        day: '2026-03-10',
        metrics: null,
        anomalies: [
            { id: 'a1', anomaly_type: 'LOW_CONFIDENCE_SPIKE', severity: 'HIGH', summary_json: {} },
            { id: 'a2', anomaly_type: 'APPEAL_OVERTURN_SPIKE', severity: 'HIGH', summary_json: {} },
        ],
        existingRules: new Set(['admission.ai_confidence_floor']),
    });

    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].target_rule, 'admission.exception_confidence_floor');
});

test('threshold helpers parse and apply rule logic deterministically', () => {
    assert.equal(
        getCandidateThreshold({
            target_rule: 'admission.ai_confidence_floor',
            proposed_value: { value: '0.65' },
        }),
        0.65,
    );
    assert.equal(getCandidateThreshold({ target_rule: 'x', proposed_value: { max: 2 } }), null);

    assert.equal(extractMinConfidence({ min_confidence: 0.52 }), 0.52);
    assert.equal(extractMinConfidence({ min_confidence: '0.49' }), 0.49);
    assert.equal(extractMinConfidence({ min_confidence: 'not-a-number' }), null);

    assert.equal(
        simulateDecisionWithThreshold('APPROVE', 0.6, 'admission.ai_confidence_floor', 0.65),
        'RESUBMIT_REQUIRED',
    );
    assert.equal(
        simulateDecisionWithThreshold('RESUBMIT_REQUIRED', 0.7, 'admission.ai_confidence_floor', 0.65),
        'APPROVE',
    );
    assert.equal(
        simulateDecisionWithThreshold('APPROVE', 0.4, 'admission.exception_confidence_floor', 0.5),
        'EXCEPTION_REQUIRED',
    );
    assert.equal(
        simulateDecisionWithThreshold('APPROVE', 0.1, 'admission.exception_confidence_floor', 0.5),
        'APPROVE',
    );
});

test('buildPolicyShadowRows + summarizeShadowRows produce stable divergence summary', () => {
    const rows = buildPolicyShadowRows({
        proposalId: 'p1',
        targetRule: 'admission.ai_confidence_floor',
        candidateThreshold: 0.65,
        runs: [
            { id: 'r1', final_decision: 'APPROVE', rule_results_json: { min_confidence: 0.6 } },
            { id: 'r2', final_decision: 'APPROVE', rule_results_json: { min_confidence: 0.7 } },
            { id: 'r3', final_decision: 'REJECT', rule_results_json: { min_confidence: 0.3 } },
        ],
    });

    assert.equal(rows.length, 3);
    assert.equal(rows[0].shadow_decision, 'RESUBMIT_REQUIRED');
    assert.equal(rows[1].shadow_decision, 'APPROVE');
    assert.equal(rows[2].shadow_decision, 'REJECT');

    const summary = summarizeShadowRows(rows);
    assert.deepEqual(summary, {
        evaluated: 3,
        diverged: 1,
        divergenceRate: 0.3333,
    });
});
