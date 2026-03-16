import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { pathToFileURL } from 'url';
import {
    asNumber,
    clamp,
    intersectionSize,
    pairKey,
    sleep,
} from './lib/hybrid-match/common.mjs';
import {
    defaultMatchHints,
    extractSelfDevelopment,
    mergeSelfDev,
    buildFreshSelfDevMap,
    getExplorationNeed,
} from './lib/hybrid-match/self-development.mjs';
import {
    buildEvidenceAllowlist,
    validateEvidence,
    valueMatchScore,
} from './lib/hybrid-match/evidence.mjs';
import {
    deterministicDirectionalPrediction,
    blendDirectionalPrediction,
    computeOutcomeCalibration,
    buildPairQueue,
    selectWithPerUserCap,
} from './lib/hybrid-match/scoring.mjs';
import { createPredictScoreWithRetry } from './lib/hybrid-match/llm.mjs';

// Thin orchestration shell: pure scoring/validation logic lives in ./lib/hybrid-match/*.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const MAX_RETRIES = 1;
const K_SMOOTHING = 10;
const EXPLORATION_RATE = Number(process.env.MATCH_EXPLORATION_RATE ?? 0.1);
const MAX_MATCHES = Number(process.env.MATCH_MAX_UPSERT ?? 50);
const MAX_NEIGHBORS_PER_USER = Number(process.env.MATCH_NEIGHBOR_LIMIT ?? 12);
const PAIR_DELAY_MS = Number(process.env.MATCH_PAIR_DELAY_MS ?? 900);
const MIN_CONFIDENCE = Number(process.env.MATCH_MIN_CONFIDENCE ?? 0.4);
const MIN_EXPLORATION_CONFIDENCE = Number(process.env.MATCH_MIN_EXPLORATION_CONFIDENCE ?? 0.32);
const MIN_GROUNDING_SCORE = Number(process.env.MATCH_MIN_GROUNDING_SCORE ?? 0.45);
const UNMATCHED_COOLDOWN_DAYS = Number(process.env.MATCH_UNMATCHED_COOLDOWN_DAYS ?? 45);
const MAX_NEW_MATCHES_PER_USER = Number(process.env.MATCH_MAX_NEW_PER_USER ?? 3);
const ENGINE_VERSION = 'hybrid-v3.2';

const predictScoreWithRetry = createPredictScoreWithRetry({
    ai,
    maxRetries: MAX_RETRIES,
});

export async function runHybridMatch() {
    console.log('--- STARTING HYBRID MATCH ENGINE (v3.2) ---');
    const runId = randomUUID();

    const now = Date.now();
    const cooldownThreshold = new Date(now - UNMATCHED_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [
        { data: traits, error: traitErr },
        { data: profiles, error: profErr },
        { data: verifiedProfiles, error: vpErr },
        { data: historyMatches, error: histErr },
    ] = await Promise.all([
        supabaseAdmin.from('user_traits').select('*'),
        supabaseAdmin.from('profiles').select('id, verified, banned, is_frozen').eq('verified', true).eq('banned', false),
        supabaseAdmin.from('user_verified_profile').select('*'),
        supabaseAdmin.from('matches').select('user1_id,user2_id,status,updated_at'),
    ]);

    if (traitErr || profErr || vpErr || histErr || !traits || !profiles || !verifiedProfiles || !historyMatches) {
        console.error('Error fetching base datasets:', { traitErr, profErr, vpErr, histErr });
        return;
    }

    const validProfileIds = new Set(
        profiles
            .filter((p) => p.is_frozen !== true)
            .map((p) => p.id),
    );
    const verifiedFeatureMap = new Map();
    for (const vp of verifiedProfiles) {
        const badgesMap = {};
        if (Array.isArray(vp.verified_badges)) {
            for (const badge of vp.verified_badges) badgesMap[badge] = true;
        }

        verifiedFeatureMap.set(vp.user_id, {
            badges: badgesMap,
            numeric: {
                height_cm: vp.height_cm,
                birth_year: vp.birth_year,
            },
            categorical: {
                location_region: vp.location_region,
                location_city: vp.location_city,
                gender: vp.gender,
            },
        });
    }

    const users = traits
        .map((t) => {
            if (!validProfileIds.has(t.user_id)) return null;
            if (!verifiedFeatureMap.has(t.user_id)) return null;
            return {
                ...t,
                verified_feature: verifiedFeatureMap.get(t.user_id),
                self_dev: extractSelfDevelopment(t.traits_json),
            };
        })
        .filter((u) => u !== null);

    if (users.length < 2) {
        console.error('Not enough eligible users for matching.');
        return;
    }

    const { data: stats, error: statErr } = await supabaseAdmin.from('user_scoring_stats').select('*');
    if (statErr || !stats) {
        console.error('Failed to load user scoring stats:', statErr);
        return;
    }

    const globalMu = stats.length > 0 ? asNumber(stats[0].mu, 3.0) : 3.0;
    const statsMap = {};
    for (const s of stats) {
        const givenCount = asNumber(s.given_count, 0);
        const recvCount = asNumber(s.received_count, 0);
        const mu = asNumber(s.mu, globalMu);
        const avgGiven = asNumber(s.avg_given_score, mu);
        const avgRecv = asNumber(s.avg_received_score, mu);
        statsMap[s.user_id] = {
            given_shrunk: ((givenCount / (givenCount + K_SMOOTHING)) * avgGiven) + ((K_SMOOTHING / (givenCount + K_SMOOTHING)) * mu),
            recv_shrunk: ((recvCount / (recvCount + K_SMOOTHING)) * avgRecv) + ((K_SMOOTHING / (recvCount + K_SMOOTHING)) * mu),
        };
    }

    const activeExposureCount = {};
    const cooldownPairs = new Set();
    for (const m of historyMatches) {
        const key = pairKey(m.user1_id, m.user2_id);
        if (m.status === 'ACTIVE') {
            activeExposureCount[m.user1_id] = (activeExposureCount[m.user1_id] || 0) + 1;
            activeExposureCount[m.user2_id] = (activeExposureCount[m.user2_id] || 0) + 1;
        }
        if (m.status === 'UNMATCHED' && m.updated_at && m.updated_at >= cooldownThreshold) {
            cooldownPairs.add(key);
        }
    }

    const userIds = users.map((u) => u.user_id);
    const [{ data: pairOutcomesRows }, { data: reviewRows }] = await Promise.all([
        supabaseAdmin
            .from('pair_outcomes')
            .select('user_id,peer_id,interaction_score,feedback_json,created_at')
            .order('created_at', { ascending: false })
            .limit(1200),
        supabaseAdmin
            .from('match_reviews')
            .select('reviewer_id,target_id,score,tags,created_at')
            .order('created_at', { ascending: false })
            .limit(1200),
    ]);

    const filteredOutcomes = (pairOutcomesRows || []).filter((row) => userIds.includes(row.user_id) || userIds.includes(row.peer_id));
    const filteredReviews = (reviewRows || []).filter((row) => userIds.includes(row.reviewer_id) || userIds.includes(row.target_id));
    const outcomeCalibration = computeOutcomeCalibration(filteredOutcomes, {
        baseExplorationRate: EXPLORATION_RATE,
    });
    console.log('Outcome calibration:', outcomeCalibration);

    const freshSelfDevMap = buildFreshSelfDevMap(userIds, filteredOutcomes, filteredReviews);
    for (const user of users) {
        const fresh = freshSelfDevMap.get(user.user_id);
        if (fresh) {
            user.self_dev = mergeSelfDev(user.self_dev, fresh);
        }
    }

    const pairQueue = buildPairQueue(users, MAX_NEIGHBORS_PER_USER);
    console.log(`Loaded users=${users.length}, pairQueue=${pairQueue.length}, cooldownPairs=${cooldownPairs.size}`);

    const candidates = [];
    const counters = {
        evaluated: 0,
        skippedCooldown: 0,
        skippedConfidence: 0,
        skippedValidation: 0,
        skippedByCap: 0,
        llmDeterministicFallback: 0,
        errors: 0,
    };

    for (const [userA, userB] of pairQueue) {
        const key = pairKey(userA.user_id, userB.user_id);
        if (cooldownPairs.has(key)) {
            counters.skippedCooldown += 1;
            continue;
        }

        counters.evaluated += 1;
        console.log(`\nEvaluating pair: ${userA.user_id} <--> ${userB.user_id}`);

        try {
            const allowA2B = buildEvidenceAllowlist(userB.traits_json, userB.verified_feature);
            const allowB2A = buildEvidenceAllowlist(userA.traits_json, userA.verified_feature);

            const promptA2B = `A가 B를 1.0~5.0으로 평가한다고 가정하고 점수/신뢰도/근거를 JSON으로 출력하세요.
근거는 반드시 허용된 field_path에서만 뽑아야 합니다.
evidence.value는 해당 field_path의 실제 값과 최대한 동일해야 합니다.
[ALLOWED_FIELD_PATHS]
${allowA2B.promptList}
User A verified: ${JSON.stringify(userA.verified_feature)}
User A traits: ${JSON.stringify(userA.traits_json)}
User B verified: ${JSON.stringify(userB.verified_feature)}
User B traits: ${JSON.stringify(userB.traits_json)}`;

            const promptB2A = `B가 A를 1.0~5.0으로 평가한다고 가정하고 점수/신뢰도/근거를 JSON으로 출력하세요.
근거는 반드시 허용된 field_path에서만 뽑아야 합니다.
evidence.value는 해당 field_path의 실제 값과 최대한 동일해야 합니다.
[ALLOWED_FIELD_PATHS]
${allowB2A.promptList}
User B verified: ${JSON.stringify(userB.verified_feature)}
User B traits: ${JSON.stringify(userB.traits_json)}
User A verified: ${JSON.stringify(userA.verified_feature)}
User A traits: ${JSON.stringify(userA.traits_json)}`;

            const [{ data: predA2B, model: modelA2B }, { data: predB2A, model: modelB2A }] = await Promise.all([
                predictScoreWithRetry(promptA2B),
                predictScoreWithRetry(promptB2A),
            ]);

            const validA2B = validateEvidence(predA2B, userB.traits_json, userB.verified_feature, allowA2B);
            const validB2A = validateEvidence(predB2A, userA.traits_json, userA.verified_feature, allowB2A);
            const detA2B = deterministicDirectionalPrediction(userA, userB);
            const detB2A = deterministicDirectionalPrediction(userB, userA);
            const blendedA2B = blendDirectionalPrediction(validA2B, detA2B, { minGroundingScore: MIN_GROUNDING_SCORE });
            const blendedB2A = blendDirectionalPrediction(validB2A, detB2A, { minGroundingScore: MIN_GROUNDING_SCORE });

            if (blendedA2B.source !== 'llm' || blendedB2A.source !== 'llm') {
                counters.llmDeterministicFallback += 1;
            }

            const minConfidence = Math.min(blendedA2B.confidence, blendedB2A.confidence);
            const minGroundingScore = Math.min(validA2B.grounding_score, validB2A.grounding_score);
            const combinedEvidence = [...blendedA2B.evidence, ...blendedB2A.evidence].slice(0, 12);
            const evidenceCount = combinedEvidence.length;

            if (evidenceCount === 0) {
                counters.skippedValidation += 1;
                continue;
            }
            if (minGroundingScore < (MIN_GROUNDING_SCORE * 0.65) && minConfidence < 0.45) {
                counters.skippedValidation += 1;
                continue;
            }
            if (minConfidence < MIN_EXPLORATION_CONFIDENCE) {
                counters.skippedConfidence += 1;
                continue;
            }

            const statA = statsMap[userA.user_id] || { given_shrunk: globalMu, recv_shrunk: globalMu };
            const statB = statsMap[userB.user_id] || { given_shrunk: globalMu, recv_shrunk: globalMu };
            const selfDevA = userA.self_dev || extractSelfDevelopment(null);
            const selfDevB = userB.self_dev || extractSelfDevelopment(null);
            const hintsA = selfDevA.match_adjustment_hints || defaultMatchHints();
            const hintsB = selfDevB.match_adjustment_hints || defaultMatchHints();

            const deltaA2B = blendedA2B.predicted_score - statA.given_shrunk - statB.recv_shrunk + globalMu;
            const deltaB2A = blendedB2A.predicted_score - statB.given_shrunk - statA.recv_shrunk + globalMu;
            const rawChem = deltaA2B + deltaB2A;

            let featureBonus = 0;
            if (userA.verified_feature?.categorical?.location_region &&
                userA.verified_feature.categorical.location_region === userB.verified_feature?.categorical?.location_region) {
                featureBonus += 0.1;
            }
            if (userA.verified_feature?.categorical?.location_city &&
                userA.verified_feature.categorical.location_city === userB.verified_feature?.categorical?.location_city) {
                featureBonus += 0.08;
            }
            if (userA.verified_feature?.numeric?.birth_year && userB.verified_feature?.numeric?.birth_year) {
                const ageGap = Math.abs(asNumber(userA.verified_feature.numeric.birth_year) - asNumber(userB.verified_feature.numeric.birth_year));
                if (ageGap <= 6) featureBonus += 0.06;
                else if (ageGap <= 12) featureBonus += 0.03;
            }

            const exposureA = activeExposureCount[userA.user_id] || 0;
            const exposureB = activeExposureCount[userB.user_id] || 0;
            const exposurePenalty = (exposureA + exposureB) * 0.06;
            const lowExposureBoost = (exposureA === 0 ? 0.05 : 0) + (exposureB === 0 ? 0.05 : 0);
            const asymmetryPenalty = Math.abs(deltaA2B - deltaB2A) * 0.12;
            const confidenceFactor = clamp(
                (0.65 + (minConfidence * 0.35)) * asNumber(outcomeCalibration.confidence_scale, 1),
                0.55,
                1.35,
            );
            const evidenceFactor = clamp(evidenceCount / 6, 0.55, 1.0);
            const groundingFactor = clamp(0.78 + (minGroundingScore * 0.3), 0.7, 1.08);
            const selfDevConfidence = Math.min(selfDevA.confidence, selfDevB.confidence);
            const hintConfidenceWeight = clamp(
                (
                    asNumber(hintsA.confidence_weight_override, 1.0) +
                    asNumber(hintsB.confidence_weight_override, 1.0)
                ) / 2,
                0.75,
                1.2,
            );
            const selfDevFactor = clamp((0.8 + (selfDevConfidence * 0.4)) * hintConfidenceWeight, 0.65, 1.25);

            const mutualPositiveOverlap = intersectionSize(selfDevA.positive_tags, selfDevB.positive_tags);
            const crossFriction = intersectionSize(selfDevA.friction_tags, selfDevB.positive_tags)
                + intersectionSize(selfDevB.friction_tags, selfDevA.positive_tags);
            const hintPreferOverlap = intersectionSize(hintsA.prefer_tags, selfDevB.positive_tags)
                + intersectionSize(hintsB.prefer_tags, selfDevA.positive_tags);
            const hintAvoidOverlap = intersectionSize(hintsA.avoid_tags, selfDevB.positive_tags)
                + intersectionSize(hintsB.avoid_tags, selfDevA.positive_tags);
            const hintFocusAlignment = intersectionSize(hintsA.focus_topics, selfDevB.focus_topics)
                + intersectionSize(hintsB.focus_topics, selfDevA.focus_topics);
            const hintPreferBoost = Math.min(0.24, hintPreferOverlap * 0.035);
            const hintAvoidPenalty = Math.min(0.3, hintAvoidOverlap * 0.05);
            const hintFocusBoost = Math.min(0.12, hintFocusAlignment * 0.03);
            const staleDaysMax = Math.max(selfDevA.stale_days, selfDevB.stale_days);
            const stalePenalty = staleDaysMax > 60 ? 0.18 : staleDaysMax > 45 ? 0.12 : staleDaysMax > 30 ? 0.06 : 0;
            const selfDevBoost = Math.min(0.35, mutualPositiveOverlap * 0.05);
            const selfDevConflictPenalty = Math.min(0.4, crossFriction * 0.06);
            const scaledConflictPenalty = Math.min(
                0.6,
                selfDevConflictPenalty * asNumber(outcomeCalibration.friction_penalty_scale, 1),
            );
            const adaptiveExplorationNeed = Number(
                (
                    (
                        getExplorationNeed(selfDevA) +
                        getExplorationNeed(selfDevB)
                    ) / 2
                ).toFixed(3),
            );

            if (crossFriction >= 3 && minConfidence < 0.55) {
                counters.skippedValidation += 1;
                continue;
            }

            const finalChem =
                (rawChem * confidenceFactor * evidenceFactor * groundingFactor * selfDevFactor) -
                asymmetryPenalty -
                exposurePenalty +
                lowExposureBoost +
                featureBonus +
                selfDevBoost -
                scaledConflictPenalty -
                stalePenalty +
                hintPreferBoost +
                hintFocusBoost -
                hintAvoidPenalty;

            const uncertainty = clamp(
                (1 - minConfidence) +
                clamp(asymmetryPenalty / 2, 0, 1) * 0.3 +
                (evidenceCount <= 2 ? 0.2 : 0) +
                ((1 - selfDevConfidence) * 0.35) +
                ((1 - minGroundingScore) * 0.25) +
                (adaptiveExplorationNeed * 0.3),
                0,
                2,
            );

            console.log(
                `Raw=${rawChem.toFixed(2)} Final=${finalChem.toFixed(2)} Conf=${minConfidence.toFixed(2)} Ev=${evidenceCount}`,
            );

            candidates.push({
                user1_id: userA.user_id,
                user2_id: userB.user_id,
                rawChem,
                finalChem,
                minConfidence,
                uncertainty,
                exposureSum: exposureA + exposureB,
                meta: {
                    pred: {
                        a_to_b: blendedA2B.predicted_score,
                        b_to_a: blendedB2A.predicted_score,
                        llm_a_to_b: validA2B.predicted_score,
                        llm_b_to_a: validB2A.predicted_score,
                    },
                    conf: {
                        a_to_b: blendedA2B.confidence,
                        b_to_a: blendedB2A.confidence,
                        llm_a_to_b: validA2B.confidence,
                        llm_b_to_a: validB2A.confidence,
                        min: minConfidence,
                    },
                    mu: globalMu,
                    given_shrunk: { a: statA.given_shrunk, b: statB.given_shrunk },
                    recv_shrunk: { a: statA.recv_shrunk, b: statB.recv_shrunk },
                    delta: {
                        a_to_b: deltaA2B,
                        b_to_a: deltaB2A,
                        raw_chem: rawChem,
                        final_chem: finalChem,
                    },
                    quality: {
                        confidence_factor: confidenceFactor,
                        evidence_factor: evidenceFactor,
                        grounding_factor: groundingFactor,
                        self_development_factor: selfDevFactor,
                        hint_confidence_weight: hintConfidenceWeight,
                        evidence_count: evidenceCount,
                        min_grounding_score: minGroundingScore,
                        llm_weight: {
                            a_to_b: blendedA2B.llm_weight,
                            b_to_a: blendedB2A.llm_weight,
                        },
                        source: {
                            a_to_b: blendedA2B.source,
                            b_to_a: blendedB2A.source,
                        },
                        uncertainty,
                        adaptive_exploration_need: adaptiveExplorationNeed,
                    },
                    signals: {
                        feature_bonus: featureBonus,
                        self_dev_boost: selfDevBoost,
                        self_dev_conflict_penalty: selfDevConflictPenalty,
                        self_dev_conflict_penalty_scaled: scaledConflictPenalty,
                        hint_prefer_boost: hintPreferBoost,
                        hint_focus_boost: hintFocusBoost,
                        hint_avoid_penalty: hintAvoidPenalty,
                        stale_penalty: stalePenalty,
                        mutual_positive_overlap: mutualPositiveOverlap,
                        cross_friction_overlap: crossFriction,
                        hint_prefer_overlap: hintPreferOverlap,
                        hint_avoid_overlap: hintAvoidOverlap,
                        hint_focus_alignment: hintFocusAlignment,
                        asymmetry_penalty: asymmetryPenalty,
                        exposure_penalty: exposurePenalty,
                        low_exposure_boost: lowExposureBoost,
                    },
                    llm_grounding: {
                        a_to_b: {
                            score: validA2B.grounding_score,
                            value_match_avg: validA2B.value_match_avg,
                            dropped: validA2B.dropped,
                            raw_evidence_count: validA2B.raw_evidence_count,
                        },
                        b_to_a: {
                            score: validB2A.grounding_score,
                            value_match_avg: validB2A.value_match_avg,
                            dropped: validB2A.dropped,
                            raw_evidence_count: validB2A.raw_evidence_count,
                        },
                        threshold: MIN_GROUNDING_SCORE,
                    },
                    exposure: {
                        user1_active_matches: exposureA,
                        user2_active_matches: exposureB,
                    },
                    evidence: combinedEvidence,
                    verified_summary: {
                        user1: userA.verified_feature,
                        user2: userB.verified_feature,
                    },
                    self_development: {
                        user1: selfDevA,
                        user2: selfDevB,
                        source: 'traits_json+fresh_feedback',
                    },
                    reason_template: `근거 태그[${combinedEvidence[0]?.why_tag || '신뢰 특성'}] 기반으로 상호 선호가 예측됩니다 (final=${finalChem.toFixed(2)}).`,
                    model: { a_to_b: modelA2B, b_to_a: modelB2A },
                    calibration: outcomeCalibration,
                    version: ENGINE_VERSION,
                    exploration: false,
                    run_id: runId,
                },
            });

            if (PAIR_DELAY_MS > 0) await sleep(PAIR_DELAY_MS);
        } catch (err) {
            counters.errors += 1;
            console.error(`Error processing pair ${userA.user_id} - ${userB.user_id}:`, err?.message || err);
        }
    }

    if (candidates.length === 0) {
        console.log('No valid candidates found after scoring/validation.');
        console.log('Counters:', counters);
        return;
    }

    candidates.sort((a, b) => b.finalChem - a.finalChem);
    const limit = Math.min(MAX_MATCHES, candidates.length);
    const effectiveExplorationRate = asNumber(outcomeCalibration.exploration_rate, EXPLORATION_RATE);
    const exploreCount = limit >= 10 ? Math.max(1, Math.floor(limit * effectiveExplorationRate)) : 0;
    const exploitSlots = limit - exploreCount;

    const exploitation = candidates
        .filter((c) => c.minConfidence >= MIN_CONFIDENCE)
        .slice(0, exploitSlots);

    const selectedKeys = new Set(exploitation.map((m) => pairKey(m.user1_id, m.user2_id)));
    const explorationPool = candidates
        .filter((c) => !selectedKeys.has(pairKey(c.user1_id, c.user2_id)) && c.minConfidence >= MIN_EXPLORATION_CONFIDENCE)
        .sort((a, b) => {
            const aSelfDevStale = asNumber(a.meta?.self_development?.user1?.stale_days, 0) + asNumber(a.meta?.self_development?.user2?.stale_days, 0);
            const bSelfDevStale = asNumber(b.meta?.self_development?.user1?.stale_days, 0) + asNumber(b.meta?.self_development?.user2?.stale_days, 0);
            const aAdaptiveNeed = asNumber(a.meta?.quality?.adaptive_exploration_need, 0.2);
            const bAdaptiveNeed = asNumber(b.meta?.quality?.adaptive_exploration_need, 0.2);
            const aBiasBoost =
                (a.meta?.self_development?.user1?.match_adjustment_hints?.exploration_bias === 'HIGH' ? 0.08 : 0) +
                (a.meta?.self_development?.user2?.match_adjustment_hints?.exploration_bias === 'HIGH' ? 0.08 : 0);
            const bBiasBoost =
                (b.meta?.self_development?.user1?.match_adjustment_hints?.exploration_bias === 'HIGH' ? 0.08 : 0) +
                (b.meta?.self_development?.user2?.match_adjustment_hints?.exploration_bias === 'HIGH' ? 0.08 : 0);
            const aPriority =
                a.uncertainty +
                (a.finalChem * 0.03) +
                ((a.exposureSum === 0 ? 0.2 : 0)) +
                Math.min(0.25, aSelfDevStale / 400) +
                (aAdaptiveNeed * 0.3) +
                aBiasBoost;
            const bPriority =
                b.uncertainty +
                (b.finalChem * 0.03) +
                ((b.exposureSum === 0 ? 0.2 : 0)) +
                Math.min(0.25, bSelfDevStale / 400) +
                (bAdaptiveNeed * 0.3) +
                bBiasBoost;
            return bPriority - aPriority;
        });

    const exploration = explorationPool.slice(0, exploreCount).map((m) => ({
        ...m,
        meta: {
            ...m.meta,
            exploration: true,
            exploration_reason: 'high_uncertainty_or_low_exposure',
        },
    }));

    const prioritized = [...exploitation, ...exploration];
    if (prioritized.length < limit) {
        for (const c of candidates) {
            const key = pairKey(c.user1_id, c.user2_id);
            if (!prioritized.some((x) => pairKey(x.user1_id, x.user2_id) === key)) {
                prioritized.push(c);
            }
            if (prioritized.length >= candidates.length) break;
        }
    }

    const { selected, perUserCount, skippedByCap } = selectWithPerUserCap(
        prioritized,
        limit,
        MAX_NEW_MATCHES_PER_USER,
    );
    counters.skippedByCap = skippedByCap;

    console.log(`\nUpserting matches selected=${selected.length} (exploit=${exploitation.length}, explore=${exploration.length})`);
    for (const match of selected) {
        const [u1, u2] = [match.user1_id, match.user2_id].sort();
        const payload = {
            user1_id: u1,
            user2_id: u2,
            status: 'ACTIVE',
            match_score: match.finalChem,
            match_meta: match.meta,
            algorithm_version: match.meta.version,
        };

        const { error: matchErr } = await supabaseAdmin
            .from('matches')
            .upsert(payload, { onConflict: 'user1_id,user2_id' });

        if (matchErr) {
            console.error('Failed to upsert match:', matchErr);
        }
    }

    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'matches',
        record_id: runId,
        action: 'INSERT',
        new_data: {
            event: 'MATCH_ENGINE_RUN',
            run_id: runId,
            engine_version: ENGINE_VERSION,
            selected_count: selected.length,
            exploit_count: exploitation.length,
            exploration_count: exploration.length,
            exploration_rate_effective: effectiveExplorationRate,
            min_grounding_score: MIN_GROUNDING_SCORE,
            max_new_matches_per_user: MAX_NEW_MATCHES_PER_USER,
            per_user_selected_count: perUserCount,
            calibration: outcomeCalibration,
            counters,
        },
        changed_by: null,
    }).then(({ error }) => {
        if (error) {
            console.warn('Failed to write match engine run audit log:', error.message);
        }
    });

    console.log('Counters:', counters);
    console.log('--- HYBRID MATCH ENGINE DONE ---');
}

// Backward-compatible helper exports used by unit tests and local tooling.
export {
    asNumber,
    clamp,
    intersectionSize,
    valueMatchScore,
    buildEvidenceAllowlist,
    deterministicDirectionalPrediction,
    blendDirectionalPrediction,
    computeOutcomeCalibration,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runHybridMatch();
}
