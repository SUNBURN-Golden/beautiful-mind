import test from 'node:test';
import assert from 'node:assert/strict';
import { assessGrounding, applyGroundingDecisionGuard } from '../../lib/server/interview-grounding.js';

test('assessGrounding returns high coverage when claims are grounded in transcript/profile', () => {
    const node = {
        decision: 'PASS',
        score: 88,
        absolute_score: 88,
        risk_flags: [],
        raw_preferences: {
            books: [{ title: '1984', why_tags: ['디스토피아'] }],
            movies: [{ title: 'Interstellar', why_tags: ['우주'] }],
            exercise: [{ modality: 'Running', why_tags: ['습관'] }],
            mbti: { self_reported: true, type: 'INTJ' }
        },
        derived_traits: {
            vibe_tags: ['분석적', '차분함']
        }
    };

    const transcript = [
        { role: 'user', content: '저는 인터스텔라 같은 우주 영화를 좋아하고 1984도 인상 깊게 읽었어요.' },
        { role: 'user', content: '평소 러닝을 자주 하고 MBTI는 INTJ입니다. 저는 분석적인 편이에요.' }
    ];

    const verifiedProfile = {
        location_region: 'SEOUL',
        highlights: ['차분함']
    };

    const grounding = assessGrounding({ node, transcript, verifiedProfile });
    assert.equal(grounding.claim_count > 0, true);
    assert.equal(grounding.coverage >= 0.55, true);
    assert.equal(grounding.supported_count >= 4, true);
});

test('applyGroundingDecisionGuard downgrades PASS to REVIEW on weak grounding', () => {
    const node = {
        decision: 'PASS',
        score: 92,
        absolute_score: 92,
        risk_flags: ['BASELINE'],
        raw_preferences: {
            books: [{ title: 'Unknown Book', why_tags: ['신비주의'] }],
            movies: [{ title: 'Unknown Movie', why_tags: ['추상'] }],
            exercise: [{ modality: 'Other', why_tags: ['미확인'] }],
            mbti: { self_reported: true, type: 'ENFP' }
        },
        derived_traits: {
            vibe_tags: ['즉흥']
        }
    };

    const grounding = {
        claim_count: 6,
        supported_count: 1,
        unsupported_count: 5,
        coverage: 0.167,
        unsupported_claims: ['Unknown Book'],
        evidence_samples: []
    };

    const guarded = applyGroundingDecisionGuard(node, grounding);
    assert.equal(guarded.resolvedNode.decision, 'REVIEW');
    assert.equal(guarded.resolvedNode.score <= 55, true);
    assert.equal(guarded.resolvedNode.absolute_score <= 55, true);
    assert.equal(guarded.resolvedNode.risk_flags.includes('LOW_GROUNDING_COVERAGE'), true);
    assert.equal(guarded.resolvedNode.risk_flags.includes('UNSUPPORTED_CLAIMS_DETECTED'), true);
});
