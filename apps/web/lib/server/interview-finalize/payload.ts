import type { SafeFinalizeNode, MatchAdjustmentHints, DevelopmentAction, TranscriptItem } from './types.ts';
import { tagOverlapRatio, toStringArray } from './normalize.ts';

type PreviousTraitsRow = {
    traits_json?: Record<string, unknown> | null;
    absolute_score?: number | null;
    updated_at?: string | null;
} | null;

type SelfDevelopmentSignals = {
    sample_size: number;
    received_review_avg: number | null;
    confidence: number;
    positive_tags: string[];
    friction_tags: string[];
    focus_topics: string[];
    [key: string]: unknown;
};

export type LearningDelta = {
    scoreDelta: number | null;
    vibeOverlap: number | null;
    groundingDelta: number | null;
    previousGrounding: number | null;
    previousTraitsUpdatedAt: string | null;
};

export function deriveLearningDelta(params: {
    previousTraitsRow: PreviousTraitsRow;
    resolvedNode: SafeFinalizeNode;
    groundingCoverage: number;
}): LearningDelta {
    const previousAbsolute = typeof params.previousTraitsRow?.absolute_score === 'number'
        ? params.previousTraitsRow.absolute_score
        : null;
    const previousGroundingCoverage = (
        params.previousTraitsRow?.traits_json &&
        typeof params.previousTraitsRow.traits_json === 'object' &&
        (params.previousTraitsRow.traits_json as Record<string, unknown>).self_development &&
        typeof (params.previousTraitsRow.traits_json as Record<string, unknown>).self_development === 'object' &&
        ((params.previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding &&
        typeof ((params.previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding === 'object'
    )
        ? (((params.previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding as Record<string, unknown>).coverage
        : null;
    const previousGrounding = typeof previousGroundingCoverage === 'number'
        ? previousGroundingCoverage
        : null;
    const previousVibeTags = toStringArray(
        (params.previousTraitsRow?.traits_json as Record<string, unknown> | null)?.derived_traits
            && typeof (params.previousTraitsRow?.traits_json as Record<string, unknown>).derived_traits === 'object'
            ? ((params.previousTraitsRow?.traits_json as Record<string, unknown>).derived_traits as Record<string, unknown>).vibe_tags
            : [],
    );
    const currentVibeTags = toStringArray(
        params.resolvedNode.derived_traits && typeof params.resolvedNode.derived_traits === 'object'
            ? (params.resolvedNode.derived_traits as Record<string, unknown>).vibe_tags
            : [],
    );

    const scoreDelta = previousAbsolute === null
        ? null
        : (params.resolvedNode.absolute_score - previousAbsolute);
    const groundingDelta = previousGrounding === null
        ? null
        : Number((params.groundingCoverage - previousGrounding).toFixed(3));

    return {
        scoreDelta,
        vibeOverlap: tagOverlapRatio(previousVibeTags, currentVibeTags),
        groundingDelta,
        previousGrounding,
        previousTraitsUpdatedAt: params.previousTraitsRow?.updated_at ?? null,
    };
}

export function buildAdaptiveRiskFlags(selfDevSignals: SelfDevelopmentSignals): string[] {
    const adaptiveRiskFlags: string[] = [];
    if (selfDevSignals.sample_size >= 8 && selfDevSignals.received_review_avg !== null && selfDevSignals.received_review_avg < 2.6) {
        adaptiveRiskFlags.push('LOW_RECIPROCITY_FEEDBACK');
    }
    if (selfDevSignals.confidence < 0.35) {
        adaptiveRiskFlags.push('LOW_BEHAVIORAL_CONFIDENCE');
    }
    return adaptiveRiskFlags;
}

export function combineRiskFlags(params: {
    existingFlags: unknown;
    nodeRiskFlags: unknown;
    adaptiveRiskFlags: string[];
}): string[] {
    const existing = Array.isArray(params.existingFlags)
        ? params.existingFlags.filter((flag: unknown): flag is string => typeof flag === 'string')
        : [];
    const fromNode = Array.isArray(params.nodeRiskFlags)
        ? params.nodeRiskFlags.filter((flag: unknown): flag is string => typeof flag === 'string')
        : [];
    return Array.from(new Set([...existing, ...fromNode, ...params.adaptiveRiskFlags]));
}

export function buildAnalysisJson(params: {
    resolvedNode: SafeFinalizeNode;
    verifiedSummaryHash: string;
    selfDevelopmentSignals: SelfDevelopmentSignals;
    grounding: Record<string, unknown>;
    learningDelta: LearningDelta;
    actionPlan: DevelopmentAction[];
    matchAdjustmentHints: MatchAdjustmentHints;
}): Record<string, unknown> {
    return {
        raw_preferences: params.resolvedNode.raw_preferences,
        derived_traits: params.resolvedNode.derived_traits,
        stage: params.resolvedNode.stage,
        verification_consistency: params.resolvedNode.verification_consistency || 'UNKNOWN',
        verification_conflicts: params.resolvedNode.verification_conflicts || [],
        verified_summary_hash_keccak: params.verifiedSummaryHash,
        self_development: {
            ...params.selfDevelopmentSignals,
            learning_delta: {
                score_delta_from_previous_interview: params.learningDelta.scoreDelta,
                vibe_overlap_with_previous_interview: params.learningDelta.vibeOverlap,
                grounding_delta_from_previous_interview: params.learningDelta.groundingDelta,
                previous_grounding_coverage: params.learningDelta.previousGrounding,
                previous_traits_updated_at: params.learningDelta.previousTraitsUpdatedAt,
            },
            grounding: params.grounding,
            action_plan: params.actionPlan,
            match_adjustment_hints: params.matchAdjustmentHints,
        },
    };
}

export function buildInterviewUpdatePayload(params: {
    analysisJson: Record<string, unknown>;
    resolvedNode: SafeFinalizeNode;
    combinedRiskFlags: string[];
    modelVersion: string;
}): Record<string, unknown> {
    return {
        analysis_json: params.analysisJson,
        decision: params.resolvedNode.decision,
        absolute_score: params.resolvedNode.absolute_score || params.resolvedNode.score,
        score: params.resolvedNode.score,
        risk_flags: params.combinedRiskFlags,
        summary: params.resolvedNode.summary,
        model_version: params.modelVersion,
        status: 'DONE',
    };
}

export function buildUserTraitsUpsertPayload(params: {
    userId: string;
    analysisJson: Record<string, unknown>;
    resolvedNode: SafeFinalizeNode;
    nowIso: string;
}): Record<string, unknown> {
    return {
        user_id: params.userId,
        traits_json: params.analysisJson,
        absolute_score: params.resolvedNode.absolute_score || params.resolvedNode.score,
        updated_at: params.nowIso,
    };
}

export type { SelfDevelopmentSignals, PreviousTraitsRow, TranscriptItem };
