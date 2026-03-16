import test from 'node:test';
import assert from 'node:assert/strict';

const {
    FALLBACK_FINALIZE_NODE,
    normalizeFinalizeNode,
    parseFinalizeNodeText,
} = await import('../../lib/server/interview-finalize/normalize.ts');
const {
    buildDevelopmentActionPlan,
    buildMatchAdjustmentHints,
} = await import('../../lib/server/interview-finalize/planning.ts');

test('normalizeFinalizeNode returns fallback for null node', () => {
    const normalized = normalizeFinalizeNode(null);
    assert.equal(normalized.decision, FALLBACK_FINALIZE_NODE.decision);
    assert.equal(normalized.summary, FALLBACK_FINALIZE_NODE.summary);
    assert.equal(normalized.risk_flags.includes('JSON_PARSE_FAIL'), true);
});

test('normalizeFinalizeNode maps absolute_score from score when missing', () => {
    const normalized = normalizeFinalizeNode({
        stage: 'FINAL',
        decision: 'PASS',
        score: 73,
        summary: 'ok',
        risk_flags: [],
        raw_preferences: {},
        derived_traits: {},
    });

    assert.equal(normalized.score, 73);
    assert.equal(normalized.absolute_score, 73);
    assert.equal(normalized.decision, 'PASS');
});

test('fallback/edge parsing behavior is stable for invalid payload', () => {
    const invalidParsed = parseFinalizeNodeText('not-json');
    assert.equal(invalidParsed, null);

    const emptyParsed = parseFinalizeNodeText('');
    assert.equal(emptyParsed, null);

    const normalizedFallback = normalizeFinalizeNode(invalidParsed);
    assert.equal(normalizedFallback.decision, 'REVIEW');
    assert.equal(normalizedFallback.risk_flags.includes('JSON_PARSE_FAIL'), true);
});

test('parseFinalizeNodeText parses valid json object', () => {
    const parsed = parseFinalizeNodeText(JSON.stringify({
        stage: 'FINAL',
        decision: 'REVIEW',
        score: 62,
        summary: 'parsed',
    }));

    assert.equal(parsed?.stage, 'FINAL');
    assert.equal(parsed?.decision, 'REVIEW');
    assert.equal(parsed?.score, 62);
});

test('buildDevelopmentActionPlan prioritizes P0 actions on severe risk flags', () => {
    const plan = buildDevelopmentActionPlan({
        focusTopics: ['SELF_MODEL_RELIABILITY', 'CONFLICT_TRIGGERS'],
        riskFlags: ['LOW_BEHAVIORAL_CONFIDENCE', 'LOW_RECIPROCITY_FEEDBACK'],
        receivedReviewAvg: 2.1,
        scoreDelta: -9,
        vibeOverlap: 0.12,
    });

    assert.equal(plan.length > 0, true);
    assert.equal(plan[0].priority, 'P0');
    assert.equal(plan.some((item) => item.action_id === 'LOW_CONFIDENCE_DATA_BOOTSTRAP'), true);
    assert.equal(plan.some((item) => item.action_id === 'RECIPROCITY_REPAIR'), true);
});

test('buildMatchAdjustmentHints raises exploration bias on weak confidence/grounding', () => {
    const hints = buildMatchAdjustmentHints({
        confidence: 0.31,
        sampleSize: 3,
        positiveTags: ['진정성'],
        frictionTags: ['지각', '회피'],
        focusTopics: ['CONFLICT_TRIGGERS'],
        riskFlags: ['LOW_BEHAVIORAL_CONFIDENCE'],
        groundingCoverage: 0.41,
    });

    assert.equal(hints.exploration_bias, 'HIGH');
    assert.equal(hints.avoid_tags.includes('지각'), true);
    assert.equal(hints.risk_flags.includes('LOW_BEHAVIORAL_CONFIDENCE'), true);
    assert.equal(hints.confidence_weight_override <= 1.15, true);
});

test('buildMatchAdjustmentHints lowers exploration bias on strong confidence/coverage', () => {
    const hints = buildMatchAdjustmentHints({
        confidence: 0.84,
        sampleSize: 18,
        positiveTags: ['호감표현', '성실'],
        frictionTags: [],
        focusTopics: ['PROFILE_MAINTENANCE'],
        riskFlags: [],
        groundingCoverage: 0.86,
    });

    assert.equal(hints.exploration_bias, 'LOW');
    assert.equal(hints.risk_flags.length, 0);
    assert.equal(hints.prefer_tags.length > 0, true);
});
