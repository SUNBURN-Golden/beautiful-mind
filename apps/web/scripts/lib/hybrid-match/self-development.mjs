import { asNumber, clamp, normalizeTagList } from './common.mjs';

function normalizeExplorationBias(value) {
    if (value === 'LOW' || value === 'NORMAL' || value === 'HIGH') return value;
    return 'NORMAL';
}

export function defaultMatchHints() {
    return {
        exploration_bias: 'NORMAL',
        confidence_weight_override: 1.0,
        avoid_tags: [],
        prefer_tags: [],
        risk_flags: [],
        focus_topics: [],
    };
}

function topTags(counter, limit = 6) {
    return [...counter.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag);
}

export function extractSelfDevelopment(traitsJson) {
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
            match_adjustment_hints: defaultMatchHints(),
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
            focus_topics: normalizeTagList(hintsSource.focus_topics).slice(0, 5),
        },
    };
}

export function mergeSelfDev(base, fresh) {
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
                    asNumber(freshHints.confidence_weight_override, 1.0),
                ),
                0.75,
                1.2,
            ),
            avoid_tags: [...new Set([...normalizeTagList(baseHints.avoid_tags), ...normalizeTagList(freshHints.avoid_tags)])].slice(0, 8),
            prefer_tags: [...new Set([...normalizeTagList(baseHints.prefer_tags), ...normalizeTagList(freshHints.prefer_tags)])].slice(0, 8),
            risk_flags: [...new Set([...normalizeTagList(baseHints.risk_flags), ...normalizeTagList(freshHints.risk_flags)])].slice(0, 6),
            focus_topics: [...new Set([...normalizeTagList(baseHints.focus_topics), ...normalizeTagList(freshHints.focus_topics), ...focus])].slice(0, 5),
        },
    };
}

export function buildFreshSelfDevMap(userIds, pairOutcomesRows, reviewRows) {
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
                focus_topics: focus.slice(0, 4),
            },
        });
    }
    return results;
}

export function getExplorationNeed(selfDev) {
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
