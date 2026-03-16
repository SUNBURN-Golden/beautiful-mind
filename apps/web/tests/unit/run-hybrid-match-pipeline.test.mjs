import test from 'node:test';
import assert from 'node:assert/strict';

const { buildPairQueue, selectWithPerUserCap } = await import('../../scripts/lib/hybrid-match/scoring.mjs');
const { mergeSelfDev, getExplorationNeed } = await import('../../scripts/lib/hybrid-match/self-development.mjs');

test('buildPairQueue creates unique undirected pairs and respects neighbor cut', () => {
    const users = [
        { user_id: 'u1', verified_feature: { categorical: { location_region: 'SEOUL' }, numeric: {} }, absolute_score: 80, self_dev: { positive_tags: [] } },
        { user_id: 'u2', verified_feature: { categorical: { location_region: 'SEOUL' }, numeric: {} }, absolute_score: 79, self_dev: { positive_tags: [] } },
        { user_id: 'u3', verified_feature: { categorical: { location_region: 'SEOUL' }, numeric: {} }, absolute_score: 78, self_dev: { positive_tags: [] } },
    ];

    const queue = buildPairQueue(users, 2);
    const keys = new Set(queue.map(([a, b]) => [a.user_id, b.user_id].sort().join('|')));

    assert.equal(queue.length, keys.size);
    assert.equal(keys.has('u1|u2'), true);
    assert.equal(keys.has('u1|u3'), true);
    assert.equal(keys.has('u2|u3'), true);
});

test('selectWithPerUserCap enforces per-user cap while preserving order', () => {
    const candidates = [
        { user1_id: 'u1', user2_id: 'u2' },
        { user1_id: 'u3', user2_id: 'u4' },
        { user1_id: 'u1', user2_id: 'u3' },
        { user1_id: 'u2', user2_id: 'u4' },
    ];

    const { selected, perUserCount, skippedByCap } = selectWithPerUserCap(candidates, 10, 1);

    assert.equal(selected.length, 2);
    assert.equal(selected[0].user1_id, 'u1');
    assert.equal(selected[0].user2_id, 'u2');
    assert.equal(selected[1].user1_id, 'u3');
    assert.equal(selected[1].user2_id, 'u4');
    assert.equal(perUserCount.u1, 1);
    assert.equal(perUserCount.u2, 1);
    assert.equal(skippedByCap >= 1, true);
});

test('mergeSelfDev keeps stronger confidence and unions hints', () => {
    const merged = mergeSelfDev(
        {
            confidence: 0.41,
            stale_days: 90,
            sample_size: 3,
            positive_tags: ['진정성'],
            friction_tags: ['지각'],
            focus_topics: ['PROFILE_MAINTENANCE'],
            match_adjustment_hints: {
                exploration_bias: 'HIGH',
                confidence_weight_override: 0.9,
                avoid_tags: ['지각'],
                prefer_tags: ['진정성'],
                risk_flags: [],
                focus_topics: ['PROFILE_MAINTENANCE'],
            },
        },
        {
            confidence: 0.72,
            stale_days: 12,
            sample_size: 14,
            positive_tags: ['대화밀도'],
            friction_tags: ['회피'],
            focus_topics: ['CONFLICT_TRIGGERS'],
            match_adjustment_hints: {
                exploration_bias: 'LOW',
                confidence_weight_override: 1.1,
                avoid_tags: ['회피'],
                prefer_tags: ['대화밀도'],
                risk_flags: ['EARLY_MISREAD'],
                focus_topics: ['CONFLICT_TRIGGERS'],
            },
        },
    );

    assert.equal(merged.confidence, 0.72);
    assert.equal(merged.stale_days, 12);
    assert.equal(merged.sample_size, 14);
    assert.equal(merged.match_adjustment_hints.confidence_weight_override, 1.1);
    assert.equal(merged.match_adjustment_hints.avoid_tags.includes('지각'), true);
    assert.equal(merged.match_adjustment_hints.avoid_tags.includes('회피'), true);
});

test('getExplorationNeed increases when confidence/sample are weak', () => {
    const lowSignalNeed = getExplorationNeed({
        confidence: 0.31,
        sample_size: 2,
        stale_days: 85,
        match_adjustment_hints: { exploration_bias: 'HIGH' },
    });
    const stableNeed = getExplorationNeed({
        confidence: 0.82,
        sample_size: 20,
        stale_days: 8,
        match_adjustment_hints: { exploration_bias: 'LOW' },
    });

    assert.equal(lowSignalNeed > stableNeed, true);
    assert.equal(lowSignalNeed <= 0.95, true);
    assert.equal(stableNeed >= 0, true);
});
