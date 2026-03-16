import test from 'node:test';
import assert from 'node:assert/strict';

const { buildEvidenceAllowlist, valueMatchScore } = await import('../../scripts/lib/hybrid-match/evidence.mjs');
const {
    deterministicDirectionalPrediction,
    blendDirectionalPrediction,
    computeOutcomeCalibration,
} = await import('../../scripts/lib/hybrid-match/scoring.mjs');

test('buildEvidenceAllowlist includes expected leaf paths', () => {
    const allowlist = buildEvidenceAllowlist(
        { derived_traits: { vibe_tags: ['calm'] } },
        { categorical: { location_region: 'SEOUL' } }
    );

    assert.equal(allowlist.pathSet.has('traits_json.derived_traits.vibe_tags'), true);
    assert.equal(allowlist.pathSet.has('verified_feature.categorical.location_region'), true);
    assert.equal(typeof allowlist.promptList, 'string');
    assert.equal(allowlist.pathList.length > 0, true);
});

test('valueMatchScore rewards exact/partial matches', () => {
    const exact = valueMatchScore('SEOUL', 'SEOUL');
    const partial = valueMatchScore('서울 강남', '서울');
    const mismatch = valueMatchScore('BUSAN', 'SEOUL');

    assert.equal(exact, 1);
    assert.equal(partial >= 0.5, true);
    assert.equal(mismatch < 0.5, true);
});

test('blendDirectionalPrediction leans deterministic when grounding is weak', () => {
    const llmPred = {
        predicted_score: 4.8,
        confidence: 0.92,
        grounding_score: 0.2,
        evidence: [{ field_path: 'traits_json.foo', value: 'x', why_tag: 'LLM' }]
    };
    const detPred = {
        predicted_score: 3.2,
        confidence: 0.6,
        evidence: [{ field_path: 'verified_feature.categorical.location_region', value: 'SEOUL', why_tag: 'REGION_MATCH' }]
    };

    const blended = blendDirectionalPrediction(llmPred, detPred);
    assert.equal(blended.source === 'deterministic' || blended.source === 'blend', true);
    assert.equal(blended.llm_weight < 0.3, true);
    assert.equal(blended.predicted_score >= 1 && blended.predicted_score <= 5, true);
});

test('computeOutcomeCalibration adapts exploration for weak outcomes', () => {
    const weakOutcomes = [
        { interaction_score: 35 },
        { interaction_score: 40 },
        { interaction_score: 38 },
        { interaction_score: 42 },
        { interaction_score: 30 },
    ];

    const calibrated = computeOutcomeCalibration(weakOutcomes);
    assert.equal(calibrated.sample_size, 5);
    assert.equal(calibrated.exploration_rate >= 0.1, true);
    assert.equal(calibrated.friction_penalty_scale >= 1.0, true);
});

test('deterministicDirectionalPrediction produces bounded score and confidence', () => {
    const viewer = {
        absolute_score: 82,
        verified_feature: {
            categorical: { location_region: 'SEOUL', location_city: 'GANGNAM' },
            numeric: { birth_year: 1995 }
        },
        self_dev: {
            positive_tags: ['성실'],
            friction_tags: ['지각']
        }
    };
    const target = {
        absolute_score: 78,
        verified_feature: {
            categorical: { location_region: 'SEOUL', location_city: 'GANGNAM' },
            numeric: { birth_year: 1994 }
        },
        self_dev: {
            positive_tags: ['성실'],
            friction_tags: []
        }
    };

    const pred = deterministicDirectionalPrediction(viewer, target);
    assert.equal(pred.predicted_score >= 1 && pred.predicted_score <= 5, true);
    assert.equal(pred.confidence >= 0 && pred.confidence <= 1, true);
    assert.equal(Array.isArray(pred.evidence), true);
});
