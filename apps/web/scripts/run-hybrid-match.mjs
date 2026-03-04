import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { pathToFileURL } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

const evaluateMatchSchema = {
    type: "OBJECT",
    properties: {
        predicted_score: { type: "NUMBER" },
        confidence: { type: "NUMBER" },
        evidence: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    field_path: { type: "STRING" },
                    value: { type: "STRING" },
                    why_tag: { type: "STRING" }
                },
                required: ["field_path", "value", "why_tag"]
            }
        }
    },
    required: ["predicted_score", "confidence", "evidence"]
};

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function asNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export function normalizeTagList(value) {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
}

function normalizeExplorationBias(value) {
    if (value === 'LOW' || value === 'NORMAL' || value === 'HIGH') return value;
    return 'NORMAL';
}

function defaultMatchHints() {
    return {
        exploration_bias: 'NORMAL',
        confidence_weight_override: 1.0,
        avoid_tags: [],
        prefer_tags: [],
        risk_flags: [],
        focus_topics: []
    };
}

export function intersectionSize(left, right) {
    if (left.length === 0 || right.length === 0) return 0;
    const set = new Set(left.map((item) => item.toLowerCase()));
    let count = 0;
    for (const item of right) {
        if (set.has(String(item).toLowerCase())) count += 1;
    }
    return count;
}

function topTags(counter, limit = 6) {
    return [...counter.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag);
}

function extractSelfDevelopment(traitsJson) {
    const source = traitsJson && typeof traitsJson === 'object'
        ? traitsJson.self_development
        : null;
    if (!source || typeof source !== 'object') {
        return {
            confidence: 0.5,
            stale_days: 999,
            sample_size: 0,
            positive_tags: [],
            friction_tags: [],
            focus_topics: [],
            match_adjustment_hints: defaultMatchHints()
        };
    }
    const hintsSource = source.match_adjustment_hints && typeof source.match_adjustment_hints === 'object'
        ? source.match_adjustment_hints
        : {};
    const rawOverride = asNumber(hintsSource.confidence_weight_override, 1.0);
    return {
        confidence: clamp(asNumber(source.confidence, 0.5), 0, 1),
        stale_days: asNumber(source.stale_days, 999),
        sample_size: asNumber(source.sample_size, 0),
        positive_tags: normalizeTagList(source.positive_tags),
        friction_tags: normalizeTagList(source.friction_tags),
        focus_topics: normalizeTagList(source.focus_topics),
        match_adjustment_hints: {
            exploration_bias: normalizeExplorationBias(hintsSource.exploration_bias),
            confidence_weight_override: clamp(rawOverride, 0.75, 1.2),
            avoid_tags: normalizeTagList(hintsSource.avoid_tags).slice(0, 8),
            prefer_tags: normalizeTagList(hintsSource.prefer_tags).slice(0, 8),
            risk_flags: normalizeTagList(hintsSource.risk_flags).slice(0, 6),
            focus_topics: normalizeTagList(hintsSource.focus_topics).slice(0, 5)
        }
    };
}

function mergeSelfDev(base, fresh) {
    const baseSafe = base || extractSelfDevelopment(null);
    const freshSafe = fresh || extractSelfDevelopment(null);
    const staleDays = Math.min(asNumber(baseSafe.stale_days, 999), asNumber(freshSafe.stale_days, 999));
    const confidence = clamp(Math.max(asNumber(baseSafe.confidence, 0), asNumber(freshSafe.confidence, 0)), 0, 1);
    const sampleSize = Math.max(asNumber(baseSafe.sample_size, 0), asNumber(freshSafe.sample_size, 0));
    const positive = [...new Set([...normalizeTagList(baseSafe.positive_tags), ...normalizeTagList(freshSafe.positive_tags)])].slice(0, 8);
    const friction = [...new Set([...normalizeTagList(baseSafe.friction_tags), ...normalizeTagList(freshSafe.friction_tags)])].slice(0, 8);
    const focus = [...new Set([...normalizeTagList(baseSafe.focus_topics), ...normalizeTagList(freshSafe.focus_topics)])].slice(0, 5);
    const baseHints = baseSafe.match_adjustment_hints || defaultMatchHints();
    const freshHints = freshSafe.match_adjustment_hints || defaultMatchHints();
    const biasRank = { LOW: 0, NORMAL: 1, HIGH: 2 };
    const mergedBias = biasRank[freshHints.exploration_bias] >= biasRank[baseHints.exploration_bias]
        ? freshHints.exploration_bias
        : baseHints.exploration_bias;
    return {
        confidence,
        stale_days: staleDays,
        sample_size: sampleSize,
        positive_tags: positive,
        friction_tags: friction,
        focus_topics: focus,
        match_adjustment_hints: {
            exploration_bias: mergedBias,
            confidence_weight_override: clamp(
                Math.max(
                    asNumber(baseHints.confidence_weight_override, 1.0),
                    asNumber(freshHints.confidence_weight_override, 1.0)
                ),
                0.75,
                1.2
            ),
            avoid_tags: [...new Set([...normalizeTagList(baseHints.avoid_tags), ...normalizeTagList(freshHints.avoid_tags)])].slice(0, 8),
            prefer_tags: [...new Set([...normalizeTagList(baseHints.prefer_tags), ...normalizeTagList(freshHints.prefer_tags)])].slice(0, 8),
            risk_flags: [...new Set([...normalizeTagList(baseHints.risk_flags), ...normalizeTagList(freshHints.risk_flags)])].slice(0, 6),
            focus_topics: [...new Set([...normalizeTagList(baseHints.focus_topics), ...normalizeTagList(freshHints.focus_topics), ...focus])].slice(0, 5)
        }
    };
}

function buildFreshSelfDevMap(userIds, pairOutcomesRows, reviewRows) {
    const map = new Map();
    const tracked = new Set(userIds);
    const now = Date.now();

    for (const id of tracked) {
        map.set(id, {
            sample_size: 0,
            positive_counter: new Map(),
            friction_counter: new Map(),
            latest_ts: 0,
        });
    }

    const addTags = (counter, tags) => {
        for (const tag of tags) {
            const key = String(tag).trim();
            if (!key) continue;
            counter.set(key, (counter.get(key) || 0) + 1);
        }
    };

    for (const row of pairOutcomesRows) {
        const ts = Date.parse(row.created_at || '');
        const rowUsers = [row.user_id, row.peer_id].filter((id) => tracked.has(id));
        if (rowUsers.length === 0) continue;

        const feedback = row.feedback_json && typeof row.feedback_json === 'object'
            ? row.feedback_json
            : {};
        const extracted = [];
        if (feedback && typeof feedback === 'object') {
            for (const value of Object.values(feedback)) {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        if (typeof item === 'string') extracted.push(item);
                    }
                } else if (typeof value === 'string') {
                    extracted.push(value);
                }
            }
        }

        for (const uid of rowUsers) {
            const slot = map.get(uid);
            if (!slot) continue;
            slot.sample_size += 1;
            if (Number.isFinite(ts)) slot.latest_ts = Math.max(slot.latest_ts, ts);
            if (typeof row.interaction_score === 'number' && row.interaction_score >= 70) {
                addTags(slot.positive_counter, ['상호만족']);
            }
            if (typeof row.interaction_score === 'number' && row.interaction_score <= 40) {
                addTags(slot.friction_counter, ['마찰위험']);
            }
            addTags(slot.positive_counter, extracted);
        }
    }

    for (const row of reviewRows) {
        const ts = Date.parse(row.created_at || '');
        const rowUsers = [row.reviewer_id, row.target_id].filter((id) => tracked.has(id));
        if (rowUsers.length === 0) continue;
        const tags = normalizeTagList(row.tags);
        for (const uid of rowUsers) {
            const slot = map.get(uid);
            if (!slot) continue;
            slot.sample_size += 1;
            if (Number.isFinite(ts)) slot.latest_ts = Math.max(slot.latest_ts, ts);
            if (typeof row.score === 'number' && row.score <= 2) {
                addTags(slot.friction_counter, tags.length > 0 ? tags : ['리뷰저점']);
            } else {
                addTags(slot.positive_counter, tags);
            }
        }
    }

    const results = new Map();
    for (const [uid, slot] of map.entries()) {
        const staleDays = slot.latest_ts > 0 ? Math.floor((now - slot.latest_ts) / (24 * 60 * 60 * 1000)) : 999;
        const sampleFactor = clamp(slot.sample_size / 20, 0, 1);
        const recencyFactor = staleDays >= 999 ? 0.25 : clamp(1 - (staleDays / 60), 0, 1);
        const confidence = Number(clamp((sampleFactor * 0.65) + (recencyFactor * 0.35), 0, 1).toFixed(3));
        const positive = topTags(slot.positive_counter, 6);
        const friction = topTags(slot.friction_counter, 6);
        const focus = [];
        if (slot.sample_size < 5) focus.push('BASELINE_PREFERENCE');
        if (friction.length > 0) focus.push('CONFLICT_TRIGGERS');
        if (positive.length === 0) focus.push('STRENGTH_SIGNAL_CLARITY');
        if (focus.length === 0) focus.push('PROFILE_MAINTENANCE');
        let explorationBias = 'NORMAL';
        if (confidence < 0.45 || slot.sample_size < 6) explorationBias = 'HIGH';
        else if (confidence > 0.78 && slot.sample_size >= 16) explorationBias = 'LOW';
        results.set(uid, {
            confidence,
            stale_days: staleDays,
            sample_size: slot.sample_size,
            positive_tags: positive,
            friction_tags: friction,
            focus_topics: focus,
            match_adjustment_hints: {
                exploration_bias: explorationBias,
                confidence_weight_override: Number((0.85 + (confidence * 0.3)).toFixed(3)),
                avoid_tags: friction.slice(0, 6),
                prefer_tags: positive.slice(0, 6),
                risk_flags: [],
                focus_topics: focus.slice(0, 4)
            }
        });
    }
    return results;
}

function getExplorationNeed(selfDev) {
    if (!selfDev || typeof selfDev !== 'object') return 0.25;
    const hints = selfDev.match_adjustment_hints || defaultMatchHints();
    let need = 0.2;
    if (selfDev.confidence < 0.45) need += 0.22;
    if (selfDev.sample_size < 6) need += 0.18;
    if (selfDev.stale_days > 45) need += 0.1;
    if (hints.exploration_bias === 'HIGH') need += 0.2;
    if (hints.exploration_bias === 'LOW') need -= 0.15;
    return clamp(need, 0, 0.95);
}

function selectWithPerUserCap(candidates, limit, maxPerUser) {
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

function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePath(obj, pathStr) {
    if (!obj || !pathStr || typeof pathStr !== 'string') return undefined;
    const normalizedPath = pathStr.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
    const keys = normalizedPath.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

function collectLeafPaths(source, prefix, out, depth = 0) {
    if (depth > 4 || source === null || source === undefined) return;
    if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean') {
        out.push({ path: prefix, value: String(source) });
        return;
    }
    if (Array.isArray(source)) {
        if (source.length === 0) return;
        const primitiveItems = source
            .filter((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
            .slice(0, 6)
            .map((item) => String(item).trim())
            .filter(Boolean);
        if (primitiveItems.length > 0 && prefix) {
            out.push({ path: prefix, value: primitiveItems.join(', ') });
        }
        source.slice(0, 4).forEach((item, index) => {
            collectLeafPaths(item, `${prefix}[${index}]`, out, depth + 1);
        });
        return;
    }
    if (typeof source === 'object') {
        const entries = Object.entries(source).slice(0, 20);
        for (const [key, value] of entries) {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            collectLeafPaths(value, nextPrefix, out, depth + 1);
        }
    }
}

function normalizeText(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTokens(value) {
    return normalizeText(value)
        .split(' ')
        .filter((token) => token.length >= 2);
}

function flattenComparable(value, depth = 0) {
    if (depth > 3 || value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.slice(0, 8).map((item) => flattenComparable(item, depth + 1)).join(' ');
    }
    if (typeof value === 'object') {
        return Object.values(value).slice(0, 12).map((item) => flattenComparable(item, depth + 1)).join(' ');
    }
    return '';
}

export function valueMatchScore(reportedValue, resolvedValue) {
    const reported = normalizeText(reportedValue);
    const resolved = normalizeText(flattenComparable(resolvedValue));
    if (!reported || !resolved) return 0;
    if (reported === resolved || resolved.includes(reported) || reported.includes(resolved)) return 1;
    const left = extractTokens(reported);
    const rightSet = new Set(extractTokens(resolved));
    if (left.length === 0 || rightSet.size === 0) return 0;
    let hit = 0;
    for (const token of left) {
        if (rightSet.has(token)) hit += 1;
    }
    return clamp(hit / left.length, 0, 1);
}

export function buildEvidenceAllowlist(targetTraits, targetVerified) {
    const raw = [];
    collectLeafPaths(targetTraits, 'traits_json', raw);
    collectLeafPaths(targetVerified, 'verified_feature', raw);

    const dedupMap = new Map();
    for (const item of raw) {
        if (!item.path || dedupMap.has(item.path)) continue;
        dedupMap.set(item.path, item.value);
    }
    const pathList = [...dedupMap.keys()].slice(0, 140);
    const pathSet = new Set(pathList);

    return {
        pathList,
        pathSet,
        promptList: pathList.slice(0, 90).join('\n')
    };
}

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
        0.88
    );

    return {
        predicted_score: clamp(score, 1, 5),
        confidence,
        evidence: evidence.slice(0, 6)
    };
}

export function blendDirectionalPrediction(llmPred, deterministicPred) {
    const llmTrust = clamp(llmPred.grounding_score * llmPred.confidence, 0, 0.9);
    const llmWeight = llmPred.grounding_score < MIN_GROUNDING_SCORE
        ? Math.min(0.22, llmTrust)
        : llmTrust;
    const detWeight = 1 - llmWeight;

    const predicted_score = clamp(
        (llmPred.predicted_score * llmWeight) + (deterministicPred.predicted_score * detWeight),
        1,
        5
    );
    const confidence = clamp(
        Math.max(
            llmPred.confidence * llmWeight,
            deterministicPred.confidence * detWeight
        ) + (llmWeight * 0.12),
        0,
        1
    );
    const source = llmWeight >= 0.6 ? 'llm' : llmWeight >= 0.3 ? 'blend' : 'deterministic';

    const evidence = [...llmPred.evidence, ...deterministicPred.evidence]
        .slice(0, 12);

    return {
        predicted_score,
        confidence,
        source,
        llm_weight: Number(llmWeight.toFixed(3)),
        evidence
    };
}

export function computeOutcomeCalibration(rows) {
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
            exploration_rate: EXPLORATION_RATE,
            confidence_scale: 1.0,
            friction_penalty_scale: 1.0
        };
    }

    const avg = scores.reduce((acc, value) => acc + value, 0) / scores.length;
    const variance = scores.reduce((acc, value) => acc + Math.pow(value - avg, 2), 0) / scores.length;
    const std = Math.sqrt(variance);
    const positiveRate = scores.filter((value) => value >= 70).length / scores.length;
    const negativeRate = scores.filter((value) => value <= 40).length / scores.length;

    const exploration_rate = clamp(
        EXPLORATION_RATE +
        ((0.42 - positiveRate) * 0.22) +
        (negativeRate * 0.08),
        0.05,
        0.32
    );
    const confidence_scale = clamp(
        1 + ((positiveRate - 0.35) * 0.35) - ((negativeRate - 0.2) * 0.25),
        0.8,
        1.2
    );
    const friction_penalty_scale = clamp(
        1 + ((negativeRate - 0.22) * 1.4),
        0.7,
        1.6
    );

    return {
        sample_size: scores.length,
        avg_interaction: Number(avg.toFixed(3)),
        positive_rate: Number(positiveRate.toFixed(3)),
        negative_rate: Number(negativeRate.toFixed(3)),
        volatility: Number(std.toFixed(3)),
        exploration_rate: Number(exploration_rate.toFixed(3)),
        confidence_scale: Number(confidence_scale.toFixed(3)),
        friction_penalty_scale: Number(friction_penalty_scale.toFixed(3))
    };
}

function heuristicAffinity(userA, userB) {
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

function buildPairQueue(users, maxNeighborsPerUser) {
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

function validateEvidence(pred, targetTraits, targetVerified, allowlist) {
    const predicted = clamp(asNumber(pred?.predicted_score, 0), 1, 5);
    let confidence = clamp(asNumber(pred?.confidence, 0), 0, 1);
    const validEvidence = [];
    let dropped = 0;
    let valueMatchSum = 0;
    const seen = new Set();

    const rawEvidence = Array.isArray(pred?.evidence) ? pred.evidence.slice(0, 12) : [];
    for (const ev of rawEvidence) {
        if (!ev || typeof ev.field_path !== 'string' || typeof ev.why_tag !== 'string') {
            dropped += 1;
            continue;
        }
        if (!allowlist.pathSet.has(ev.field_path)) {
            dropped += 1;
            continue;
        }
        const sig = `${ev.field_path}|${String(ev.value ?? '')}`;
        if (seen.has(sig)) continue;
        seen.add(sig);

        let resolved = resolvePath(targetTraits, ev.field_path) ?? resolvePath(targetVerified, ev.field_path);
        if (resolved === undefined && ev.field_path.startsWith('verified_feature.')) {
            resolved = resolvePath(targetVerified, ev.field_path.replace('verified_feature.', ''));
        }
        if (resolved === undefined && ev.field_path.startsWith('traits_json.')) {
            resolved = resolvePath(targetTraits, ev.field_path.replace('traits_json.', ''));
        }

        if (resolved !== undefined) {
            const matchScore = valueMatchScore(ev.value ?? '', resolved);
            valueMatchSum += matchScore;
            validEvidence.push({
                field_path: ev.field_path,
                value: String(ev.value ?? ''),
                why_tag: ev.why_tag,
                match_score: Number(matchScore.toFixed(3))
            });
        } else {
            dropped += 1;
        }
    }

    const rawCount = rawEvidence.length;
    const structuralValidity = rawCount > 0 ? validEvidence.length / rawCount : 0;
    const valueMatchAvg = validEvidence.length > 0 ? valueMatchSum / validEvidence.length : 0;
    const groundingScore = clamp((structuralValidity * 0.6) + (valueMatchAvg * 0.4), 0, 1);

    confidence = confidence * Math.pow(0.82, dropped);
    confidence = confidence * (0.65 + (groundingScore * 0.35));
    if (validEvidence.length === 0) confidence *= 0.25;
    if (validEvidence.length === 1) confidence *= 0.85;

    return {
        predicted_score: predicted,
        confidence: clamp(confidence, 0, 1),
        evidence: validEvidence,
        dropped,
        raw_evidence_count: rawCount,
        value_match_avg: Number(valueMatchAvg.toFixed(3)),
        grounding_score: Number(groundingScore.toFixed(3))
    };
}

async function predictScoreWithRetry(prompt, retries = 0) {
    let currentModel = 'gemini-2.5-flash';
    if (!ai) {
        return {
            data: {
                predicted_score: 4.0,
                confidence: 0.55,
                evidence: [{ field_path: "categorical.location_region", value: "N/A", why_tag: "지역 기반 친화도" }]
            },
            model: 'mock-model-v2'
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: evaluateMatchSchema,
                systemInstruction:
                    '반드시 JSON 스키마만 출력할 것. evidence.field_path는 입력의 ALLOWED_FIELD_PATHS에 존재하는 경로만 사용하고, 없는 사실을 만들지 말 것. 불확실하면 predicted_score=3 근처, confidence는 낮게 반환할 것.'
            }
        });
        return { data: JSON.parse(response.text || '{}'), model: currentModel };
    } catch (err) {
        const isRetryable =
            err?.status === 429 ||
            err?.status === 503 ||
            err?.message?.includes('429') ||
            err?.message?.includes('503') ||
            err?.message?.includes('limit: 0') ||
            err?.message?.includes('404');

        if (isRetryable && retries < MAX_RETRIES) {
            currentModel = 'gemini-2.0-flash';
            await sleep(800 + Math.random() * 200);
            return predictScoreWithRetry(prompt, retries + 1);
        }
        throw err;
    }
}

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
            .map((p) => p.id)
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
                birth_year: vp.birth_year
            },
            categorical: {
                location_region: vp.location_region,
                location_city: vp.location_city,
                gender: vp.gender
            }
        });
    }

    const users = traits
        .map((t) => {
            if (!validProfileIds.has(t.user_id)) return null;
            if (!verifiedFeatureMap.has(t.user_id)) return null;
            return {
                ...t,
                verified_feature: verifiedFeatureMap.get(t.user_id),
                self_dev: extractSelfDevelopment(t.traits_json)
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
            recv_shrunk: ((recvCount / (recvCount + K_SMOOTHING)) * avgRecv) + ((K_SMOOTHING / (recvCount + K_SMOOTHING)) * mu)
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
    const outcomeCalibration = computeOutcomeCalibration(filteredOutcomes);
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
        errors: 0
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
                predictScoreWithRetry(promptB2A)
            ]);

            const validA2B = validateEvidence(predA2B, userB.traits_json, userB.verified_feature, allowA2B);
            const validB2A = validateEvidence(predB2A, userA.traits_json, userA.verified_feature, allowB2A);
            const detA2B = deterministicDirectionalPrediction(userA, userB);
            const detB2A = deterministicDirectionalPrediction(userB, userA);
            const blendedA2B = blendDirectionalPrediction(validA2B, detA2B);
            const blendedB2A = blendDirectionalPrediction(validB2A, detB2A);

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
                1.35
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
                1.2
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
                selfDevConflictPenalty * asNumber(outcomeCalibration.friction_penalty_scale, 1)
            );
            const adaptiveExplorationNeed = Number(
                (
                    (
                        getExplorationNeed(selfDevA) +
                        getExplorationNeed(selfDevB)
                    ) / 2
                ).toFixed(3)
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
                2
            );

            console.log(
                `Raw=${rawChem.toFixed(2)} Final=${finalChem.toFixed(2)} Conf=${minConfidence.toFixed(2)} Ev=${evidenceCount}`
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
                        llm_b_to_a: validB2A.predicted_score
                    },
                    conf: {
                        a_to_b: blendedA2B.confidence,
                        b_to_a: blendedB2A.confidence,
                        llm_a_to_b: validA2B.confidence,
                        llm_b_to_a: validB2A.confidence,
                        min: minConfidence
                    },
                    mu: globalMu,
                    given_shrunk: { a: statA.given_shrunk, b: statB.given_shrunk },
                    recv_shrunk: { a: statA.recv_shrunk, b: statB.recv_shrunk },
                    delta: {
                        a_to_b: deltaA2B,
                        b_to_a: deltaB2A,
                        raw_chem: rawChem,
                        final_chem: finalChem
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
                            b_to_a: blendedB2A.llm_weight
                        },
                        source: {
                            a_to_b: blendedA2B.source,
                            b_to_a: blendedB2A.source
                        },
                        uncertainty,
                        adaptive_exploration_need: adaptiveExplorationNeed
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
                        low_exposure_boost: lowExposureBoost
                    },
                    llm_grounding: {
                        a_to_b: {
                            score: validA2B.grounding_score,
                            value_match_avg: validA2B.value_match_avg,
                            dropped: validA2B.dropped,
                            raw_evidence_count: validA2B.raw_evidence_count
                        },
                        b_to_a: {
                            score: validB2A.grounding_score,
                            value_match_avg: validB2A.value_match_avg,
                            dropped: validB2A.dropped,
                            raw_evidence_count: validB2A.raw_evidence_count
                        },
                        threshold: MIN_GROUNDING_SCORE
                    },
                    exposure: {
                        user1_active_matches: exposureA,
                        user2_active_matches: exposureB
                    },
                    evidence: combinedEvidence,
                    verified_summary: {
                        user1: userA.verified_feature,
                        user2: userB.verified_feature
                    },
                    self_development: {
                        user1: selfDevA,
                        user2: selfDevB,
                        source: 'traits_json+fresh_feedback'
                    },
                    reason_template: `근거 태그[${combinedEvidence[0]?.why_tag || '신뢰 특성'}] 기반으로 상호 선호가 예측됩니다 (final=${finalChem.toFixed(2)}).`,
                    model: { a_to_b: modelA2B, b_to_a: modelB2A },
                    calibration: outcomeCalibration,
                    version: ENGINE_VERSION,
                    exploration: false,
                    run_id: runId
                }
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
            exploration_reason: 'high_uncertainty_or_low_exposure'
        }
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
        MAX_NEW_MATCHES_PER_USER
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
            algorithm_version: match.meta.version
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
            counters
        },
        changed_by: null
    }).then(({ error }) => {
        if (error) {
            console.warn('Failed to write match engine run audit log:', error.message);
        }
    });

    console.log('Counters:', counters);
    console.log('--- HYBRID MATCH ENGINE DONE ---');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runHybridMatch();
}
