import type { SupabaseClient } from '@supabase/supabase-js';

type PairOutcomeRow = {
    user_id: string;
    peer_id: string;
    interaction_score: number | null;
    feedback_json: unknown;
    created_at: string;
};

type MatchReviewRow = {
    reviewer_id: string;
    target_id: string;
    score: number | null;
    tags: unknown;
    feedback_text: string | null;
    created_at: string;
};

export type SelfDevelopmentSignals = {
    version: 'v1';
    sample_size: number;
    last_event_at: string | null;
    stale_days: number | null;
    interaction_avg: number | null;
    given_review_avg: number | null;
    received_review_avg: number | null;
    positive_tags: string[];
    friction_tags: string[];
    focus_topics: string[];
    confidence: number;
    summary: string;
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number | null {
    if (values.length === 0) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Number((sum / values.length).toFixed(3));
}

function normalizeTag(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const tag = value.trim();
    if (!tag) return null;
    if (tag.length > 48) return tag.slice(0, 48);
    return tag;
}

function collectStringTags(input: unknown, collector: string[], depth = 0): void {
    if (depth > 3) return;
    if (typeof input === 'string') {
        const normalized = normalizeTag(input);
        if (normalized) collector.push(normalized);
        return;
    }
    if (Array.isArray(input)) {
        for (const item of input) {
            collectStringTags(item, collector, depth + 1);
        }
        return;
    }
    if (input && typeof input === 'object') {
        const record = input as Record<string, unknown>;
        for (const key of Object.keys(record)) {
            collectStringTags(record[key], collector, depth + 1);
        }
    }
}

function addTagCounts(
    values: string[],
    counter: Map<string, { label: string; count: number }>
): void {
    for (const value of values) {
        const key = value.toLowerCase();
        const found = counter.get(key);
        if (found) {
            found.count += 1;
        } else {
            counter.set(key, { label: value, count: 1 });
        }
    }
}

function topTags(counter: Map<string, { label: string; count: number }>, limit = 6): string[] {
    return [...counter.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((entry) => entry.label);
}

function toDaysDiff(timestamp: string | null): number | null {
    if (!timestamp) return null;
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) return null;
    const diffMs = Date.now() - parsed;
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function computeFocusTopics(params: {
    sampleSize: number;
    givenAvg: number | null;
    receivedAvg: number | null;
    frictionTags: string[];
    positiveTags: string[];
    confidence: number;
}): string[] {
    const topics: string[] = [];
    const { sampleSize, givenAvg, receivedAvg, frictionTags, positiveTags, confidence } = params;

    if (sampleSize < 6) topics.push('BASELINE_PREFERENCE');
    if (receivedAvg !== null && receivedAvg < 3.0) topics.push('BOUNDARIES_AND_SIGNALING');
    if (givenAvg !== null && receivedAvg !== null && (givenAvg - receivedAvg) > 0.8) {
        topics.push('EXPECTATION_ALIGNMENT');
    }
    if (frictionTags.length > 0) topics.push('CONFLICT_TRIGGERS');
    if (positiveTags.length === 0) topics.push('STRENGTH_SIGNAL_CLARITY');
    if (confidence < 0.45) topics.push('SELF_MODEL_RELIABILITY');

    if (topics.length === 0) topics.push('PROFILE_MAINTENANCE');
    return [...new Set(topics)].slice(0, 4);
}

export async function buildSelfDevelopmentSignals(
    supabase: SupabaseClient,
    userId: string,
    options?: { limit?: number }
): Promise<SelfDevelopmentSignals> {
    const limit = options?.limit ?? 30;

    const [{ data: outcomes }, { data: reviews }] = await Promise.all([
        supabase
            .from('pair_outcomes')
            .select('user_id,peer_id,interaction_score,feedback_json,created_at')
            .or(`user_id.eq.${userId},peer_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit),
        supabase
            .from('match_reviews')
            .select('reviewer_id,target_id,score,tags,feedback_text,created_at')
            .or(`reviewer_id.eq.${userId},target_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit),
    ]);

    const pairRows = (outcomes || []) as PairOutcomeRow[];
    const reviewRows = (reviews || []) as MatchReviewRow[];

    const interactionScores: number[] = [];
    const givenScores: number[] = [];
    const receivedScores: number[] = [];
    const positiveMap = new Map<string, { label: string; count: number }>();
    const frictionMap = new Map<string, { label: string; count: number }>();
    const eventTimes: string[] = [];

    for (const row of pairRows) {
        if (typeof row.interaction_score === 'number') {
            interactionScores.push(row.interaction_score);
            if (row.interaction_score >= 70) {
                addTagCounts(['상호만족'], positiveMap);
            } else if (row.interaction_score <= 40) {
                addTagCounts(['마찰위험'], frictionMap);
            }
        }
        if (typeof row.created_at === 'string') eventTimes.push(row.created_at);

        const feedbackTags: string[] = [];
        if (row.feedback_json && typeof row.feedback_json === 'object') {
            const feedback = row.feedback_json as Record<string, unknown>;
            const positiveCandidates: string[] = [];
            const frictionCandidates: string[] = [];

            for (const [key, value] of Object.entries(feedback)) {
                if (/negative|risk|concern|issue|conflict|avoid|bad/i.test(key)) {
                    collectStringTags(value, frictionCandidates);
                } else if (/positive|good|strength|like|preference|tag|highlight/i.test(key)) {
                    collectStringTags(value, positiveCandidates);
                } else {
                    collectStringTags(value, feedbackTags);
                }
            }
            addTagCounts(positiveCandidates, positiveMap);
            addTagCounts(frictionCandidates, frictionMap);
        }
        addTagCounts(feedbackTags, positiveMap);
    }

    for (const row of reviewRows) {
        if (typeof row.created_at === 'string') eventTimes.push(row.created_at);
        if (typeof row.score === 'number') {
            if (row.reviewer_id === userId) {
                givenScores.push(row.score);
            }
            if (row.target_id === userId) {
                receivedScores.push(row.score);
            }
        }

        const rowTags: string[] = [];
        collectStringTags(row.tags, rowTags);

        if ((row.score ?? 0) >= 4) {
            addTagCounts(rowTags, positiveMap);
        } else if ((row.score ?? 0) <= 2) {
            addTagCounts(rowTags, frictionMap);
        } else {
            addTagCounts(rowTags, positiveMap);
        }

        if (row.feedback_text && row.feedback_text.length > 0) {
            if ((row.score ?? 0) <= 2) {
                addTagCounts(['커뮤니케이션'], frictionMap);
            } else if ((row.score ?? 0) >= 4) {
                addTagCounts(['호감표현'], positiveMap);
            }
        }
    }

    const interactionAvg = average(interactionScores);
    const givenAvg = average(givenScores);
    const receivedAvg = average(receivedScores);

    const sampleSize = interactionScores.length + givenScores.length + receivedScores.length;
    const lastEventAt = eventTimes.length > 0
        ? eventTimes.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
        : null;
    const staleDays = toDaysDiff(lastEventAt);

    const sampleFactor = clamp(sampleSize / 24, 0, 1);
    const sideFactor = givenScores.length > 0 && receivedScores.length > 0 ? 1 : 0.4;
    const recencyFactor = staleDays === null ? 0.3 : clamp(1 - (staleDays / 45), 0, 1);
    const confidence = Number(clamp((sampleFactor * 0.55) + (sideFactor * 0.2) + (recencyFactor * 0.25), 0, 1).toFixed(3));

    const positiveTags = topTags(positiveMap, 6);
    const frictionTags = topTags(frictionMap, 6);
    const focusTopics = computeFocusTopics({
        sampleSize,
        givenAvg,
        receivedAvg,
        frictionTags,
        positiveTags,
        confidence,
    });

    const summary = [
        `sample=${sampleSize}`,
        `given=${givenAvg ?? 'n/a'}`,
        `received=${receivedAvg ?? 'n/a'}`,
        `confidence=${confidence}`,
        `focus=${focusTopics.join('|')}`,
    ].join('; ');

    return {
        version: 'v1',
        sample_size: sampleSize,
        last_event_at: lastEventAt,
        stale_days: staleDays,
        interaction_avg: interactionAvg,
        given_review_avg: givenAvg,
        received_review_avg: receivedAvg,
        positive_tags: positiveTags,
        friction_tags: frictionTags,
        focus_topics: focusTopics,
        confidence,
        summary,
    };
}
