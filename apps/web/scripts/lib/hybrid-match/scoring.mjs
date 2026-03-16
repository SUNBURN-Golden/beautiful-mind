import { asNumber, clamp, intersectionSize, pairKey } from './common.mjs';
import { extractSelfDevelopment } from './self-development.mjs';

export function deterministicDirectionalPrediction(viewer, target) {
    let score = 3.0;
    const evidence = [];
    const viewerVerified = viewer.verified_feature || {};
    const targetVerified = target.verified_feature || {};

    const regionA = viewerVerified?.categorical?.location_region;
    const regionB = targetVerified?.categorical?.location_region;
    const cityA = viewerVerified?.categorical?.location_city;
    const cityB = targetVerified?.categorical?.location_city;

    if (regionA && regionB && regionA === regionB) {
        score += 0.4;
        evidence.push({ field_path: 'verified_feature.categorical.location_region', value: String(regionB), why_tag: 'REGION_MATCH' });
    }
    if (cityA && cityB && cityA === cityB) {
        score += 0.22;
        evidence.push({ field_path: 'verified_feature.categorical.location_city', value: String(cityB), why_tag: 'CITY_MATCH' });
    }

    const birthA = asNumber(viewerVerified?.numeric?.birth_year, 0);
    const birthB = asNumber(targetVerified?.numeric?.birth_year, 0);
    if (birthA > 0 && birthB > 0) {
        const gap = Math.abs(birthA - birthB);
        if (gap <= 4) score += 0.32;
        else if (gap <= 8) score += 0.18;
        else if (gap >= 17) score -= 0.12;
        evidence.push({ field_path: 'verified_feature.numeric.birth_year', value: String(birthB), why_tag: 'AGE_COMPAT' });
    }

    if (viewer.absolute_score !== null && viewer.absolute_score !== undefined && target.absolute_score !== null && target.absolute_score !== undefined) {
        const traitGap = Math.abs(asNumber(viewer.absolute_score) - asNumber(target.absolute_score));
        score += clamp(0.3 - (traitGap / 100), -0.2, 0.3);
        evidence.push({ field_path: 'absolute_score', value: String(target.absolute_score), why_tag: 'TRAIT_DISTANCE' });
    }

    const viewerSelf = viewer.self_dev || extractSelfDevelopment(null);
    const targetSelf = target.self_dev || extractSelfDevelopment(null);
    const positiveOverlap = intersectionSize(viewerSelf.positive_tags, targetSelf.positive_tags);
    const crossFriction = intersectionSize(viewerSelf.friction_tags, targetSelf.positive_tags);
    score += Math.min(0.35, positiveOverlap * 0.06);
    score -= Math.min(0.4, crossFriction * 0.07);

    const confidence = clamp(
        0.48 +
        Math.min(0.22, positiveOverlap * 0.04) -
        Math.min(0.16, crossFriction * 0.04) +
        (regionA && regionB && regionA === regionB ? 0.08 : 0),
        0.35,
        0.88,
    );

    return {
        predicted_score: clamp(score, 1, 5),
        confidence,
        evidence: evidence.slice(0, 6),
    };
}

export function blendDirectionalPrediction(llmPred, deterministicPred, options = {}) {
    const minGroundingScore = Number.isFinite(options.minGroundingScore) ? options.minGroundingScore : 0.45;

    const llmTrust = clamp(llmPred.grounding_score * llmPred.confidence, 0, 0.9);
    const llmWeight = llmPred.grounding_score < minGroundingScore
        ? Math.min(0.22, llmTrust)
        : llmTrust;
    const detWeight = 1 - llmWeight;

    const predicted_score = clamp(
        (llmPred.predicted_score * llmWeight) + (deterministicPred.predicted_score * detWeight),
        1,
        5,
    );
    const confidence = clamp(
        Math.max(
            llmPred.confidence * llmWeight,
            deterministicPred.confidence * detWeight,
        ) + (llmWeight * 0.12),
        0,
        1,
    );
    const source = llmWeight >= 0.6 ? 'llm' : llmWeight >= 0.3 ? 'blend' : 'deterministic';

    const evidence = [...llmPred.evidence, ...deterministicPred.evidence]
        .slice(0, 12);

    return {
        predicted_score,
        confidence,
        source,
        llm_weight: Number(llmWeight.toFixed(3)),
        evidence,
    };
}

export function computeOutcomeCalibration(rows, options = {}) {
    const baseExplorationRate = Number.isFinite(options.baseExplorationRate) ? options.baseExplorationRate : 0.1;
    const scores = rows
        .map((row) => asNumber(row.interaction_score, NaN))
        .filter((value) => Number.isFinite(value));

    if (scores.length === 0) {
        return {
            sample_size: 0,
            avg_interaction: null,
            positive_rate: null,
            negative_rate: null,
            volatility: null,
            exploration_rate: baseExplorationRate,
            confidence_scale: 1.0,
            friction_penalty_scale: 1.0,
        };
    }

    const avg = scores.reduce((acc, value) => acc + value, 0) / scores.length;
    const variance = scores.reduce((acc, value) => acc + Math.pow(value - avg, 2), 0) / scores.length;
    const std = Math.sqrt(variance);
    const positiveRate = scores.filter((value) => value >= 70).length / scores.length;
    const negativeRate = scores.filter((value) => value <= 40).length / scores.length;

    const exploration_rate = clamp(
        baseExplorationRate +
        ((0.42 - positiveRate) * 0.22) +
        (negativeRate * 0.08),
        0.05,
        0.32,
    );
    const confidence_scale = clamp(
        1 + ((positiveRate - 0.35) * 0.35) - ((negativeRate - 0.2) * 0.25),
        0.8,
        1.2,
    );
    const friction_penalty_scale = clamp(
        1 + ((negativeRate - 0.22) * 1.4),
        0.7,
        1.6,
    );

    return {
        sample_size: scores.length,
        avg_interaction: Number(avg.toFixed(3)),
        positive_rate: Number(positiveRate.toFixed(3)),
        negative_rate: Number(negativeRate.toFixed(3)),
        volatility: Number(std.toFixed(3)),
        exploration_rate: Number(exploration_rate.toFixed(3)),
        confidence_scale: Number(confidence_scale.toFixed(3)),
        friction_penalty_scale: Number(friction_penalty_scale.toFixed(3)),
    };
}

export function heuristicAffinity(userA, userB) {
    let score = 0;
    const catA = userA.verified_feature?.categorical ?? {};
    const catB = userB.verified_feature?.categorical ?? {};
    const numA = userA.verified_feature?.numeric ?? {};
    const numB = userB.verified_feature?.numeric ?? {};

    if (catA.location_region && catA.location_region === catB.location_region) score += 1.0;
    if (catA.location_city && catA.location_city === catB.location_city) score += 0.5;

    if (numA.birth_year && numB.birth_year) {
        const gap = Math.abs(asNumber(numA.birth_year) - asNumber(numB.birth_year));
        score += clamp(1 - gap / 18, 0, 1) * 0.5;
    }

    if (numA.height_cm && numB.height_cm) {
        const gap = Math.abs(asNumber(numA.height_cm) - asNumber(numB.height_cm));
        score += clamp(1 - gap / 35, 0, 1) * 0.25;
    }

    if (userA.absolute_score !== null && userA.absolute_score !== undefined && userB.absolute_score !== null && userB.absolute_score !== undefined) {
        const gap = Math.abs(asNumber(userA.absolute_score) - asNumber(userB.absolute_score));
        score += clamp(1 - gap / 35, 0, 1) * 0.75;
    }

    if (userA.self_dev && userB.self_dev) {
        const tagOverlap = intersectionSize(userA.self_dev.positive_tags, userB.self_dev.positive_tags);
        score += Math.min(0.4, tagOverlap * 0.08);
    }

    return score;
}

export function buildPairQueue(users, maxNeighborsPerUser) {
    const userById = new Map(users.map((u) => [u.user_id, u]));
    const pairKeys = new Set();

    for (const user of users) {
        const peers = users
            .filter((other) => other.user_id !== user.user_id)
            .map((other) => ({ other, affinity: heuristicAffinity(user, other) }))
            .sort((a, b) => b.affinity - a.affinity)
            .slice(0, maxNeighborsPerUser);

        for (const peer of peers) {
            pairKeys.add(pairKey(user.user_id, peer.other.user_id));
        }
    }

    const queue = [];
    for (const key of pairKeys) {
        const [a, b] = key.split('|');
        const userA = userById.get(a);
        const userB = userById.get(b);
        if (userA && userB) queue.push([userA, userB]);
    }
    return queue;
}

export function selectWithPerUserCap(candidates, limit, maxPerUser) {
    const selected = [];
    const perUserCount = {};
    let skippedByCap = 0;

    for (const candidate of candidates) {
        const u1 = candidate.user1_id;
        const u2 = candidate.user2_id;
        const c1 = perUserCount[u1] || 0;
        const c2 = perUserCount[u2] || 0;
        if (maxPerUser > 0 && (c1 >= maxPerUser || c2 >= maxPerUser)) {
            skippedByCap += 1;
            continue;
        }
        selected.push(candidate);
        perUserCount[u1] = c1 + 1;
        perUserCount[u2] = c2 + 1;
        if (selected.length >= limit) break;
    }

    return { selected, perUserCount, skippedByCap };
}
