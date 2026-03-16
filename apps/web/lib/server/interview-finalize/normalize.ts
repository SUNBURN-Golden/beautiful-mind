import type { FinalizeNode, SafeFinalizeNode } from './types.ts';

export const FALLBACK_FINALIZE_NODE: SafeFinalizeNode = {
    stage: 'FINAL',
    decision: 'REVIEW',
    score: 0,
    absolute_score: 0,
    summary: 'Failed to parse final AI output.',
    risk_flags: ['JSON_PARSE_FAIL'],
    raw_preferences: { books: [], movies: [], exercise: [], mbti: { self_reported: false, type: null } },
    derived_traits: {
        intellectual_complexity: 'MEDIUM',
        stimulation_seeking: 'MODERATE',
        discipline_level: 'MEDIUM',
        social_energy: 'AMBIVERT',
        vibe_tags: [],
    },
};

export function parseFinalizeNodeText(text: unknown): FinalizeNode | null {
    if (typeof text !== 'string' || text.trim().length === 0) return null;
    try {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as FinalizeNode;
    } catch {
        return null;
    }
}

export function normalizeFinalizeNode(node: FinalizeNode | null): SafeFinalizeNode {
    if (!node) {
        return FALLBACK_FINALIZE_NODE;
    }

    return {
        stage: typeof node.stage === 'string' ? node.stage : FALLBACK_FINALIZE_NODE.stage,
        decision: typeof node.decision === 'string' ? node.decision : FALLBACK_FINALIZE_NODE.decision,
        score: typeof node.score === 'number' ? node.score : FALLBACK_FINALIZE_NODE.score,
        absolute_score: typeof node.absolute_score === 'number'
            ? node.absolute_score
            : (typeof node.score === 'number' ? node.score : FALLBACK_FINALIZE_NODE.absolute_score),
        summary: typeof node.summary === 'string' ? node.summary : FALLBACK_FINALIZE_NODE.summary,
        risk_flags: Array.isArray(node.risk_flags)
            ? node.risk_flags.filter((flag): flag is string => typeof flag === 'string')
            : FALLBACK_FINALIZE_NODE.risk_flags,
        raw_preferences: (node.raw_preferences && typeof node.raw_preferences === 'object')
            ? node.raw_preferences
            : FALLBACK_FINALIZE_NODE.raw_preferences,
        derived_traits: (node.derived_traits && typeof node.derived_traits === 'object')
            ? node.derived_traits
            : FALLBACK_FINALIZE_NODE.derived_traits,
        verification_consistency: typeof node.verification_consistency === 'string'
            ? node.verification_consistency
            : undefined,
        verification_conflicts: Array.isArray(node.verification_conflicts)
            ? node.verification_conflicts
            : undefined,
    };
}

export function deepStableStringify(obj: unknown): string {
    if (obj === null || obj === undefined) return JSON.stringify(null);
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map(item => deepStableStringify(item)).join(',')}]`;
    const sortedKeys = Object.keys(obj).sort();
    const result: string[] = [];
    const indexed = obj as Record<string, unknown>;
    for (const key of sortedKeys) {
        result.push(`"${key}":${deepStableStringify(indexed[key])}`);
    }
    return `{${result.join(',')}}`;
}

export function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
}

export function tagOverlapRatio(source: string[], target: string[]): number | null {
    if (source.length === 0 || target.length === 0) return null;
    const sourceSet = new Set(source.map((tag) => tag.toLowerCase()));
    const targetSet = new Set(target.map((tag) => tag.toLowerCase()));
    let intersection = 0;
    for (const tag of sourceSet) {
        if (targetSet.has(tag)) intersection += 1;
    }
    const union = new Set([...sourceSet, ...targetSet]).size;
    if (union === 0) return null;
    return Number((intersection / union).toFixed(3));
}
