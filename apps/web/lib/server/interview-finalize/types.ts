export type FinalizeNode = {
    stage?: string;
    decision?: string;
    score?: number;
    absolute_score?: number;
    summary?: string;
    risk_flags?: string[];
    raw_preferences?: Record<string, unknown>;
    derived_traits?: Record<string, unknown>;
    verification_consistency?: string;
    verification_conflicts?: unknown[];
};

export type SafeFinalizeNode = {
    stage: string;
    decision: string;
    score: number;
    absolute_score: number;
    summary: string;
    risk_flags: string[];
    raw_preferences: Record<string, unknown>;
    derived_traits: Record<string, unknown>;
    verification_consistency?: string;
    verification_conflicts?: unknown[];
};

export type DevelopmentAction = {
    action_id: string;
    title: string;
    reason: string;
    metric: string;
    target: string;
    horizon_days: number;
    priority: 'P0' | 'P1' | 'P2';
};

export type MatchAdjustmentHints = {
    exploration_bias: 'LOW' | 'NORMAL' | 'HIGH';
    confidence_weight_override: number;
    avoid_tags: string[];
    prefer_tags: string[];
    focus_topics: string[];
    risk_flags: string[];
};

export type TranscriptItem = {
    role?: string;
    content?: string;
};

export type FinalizeAiResult = {
    safeNode: SafeFinalizeNode;
    modelUsed: string;
    parseFailed: boolean;
};
