import type { SupabaseClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { buildSelfDevelopmentSignals } from '@/lib/server/self-development';
import { assessGrounding, applyGroundingDecisionGuard } from '@/lib/server/interview-grounding';
import { buildFinalizePrompt, generateFinalizeNodeWithRetry } from './ai.ts';
import { deepStableStringify } from './normalize.ts';
import { buildDevelopmentActionPlan, buildMatchAdjustmentHints } from './planning.ts';
import {
    buildAdaptiveRiskFlags,
    buildAnalysisJson,
    buildInterviewUpdatePayload,
    buildUserTraitsUpsertPayload,
    combineRiskFlags,
    deriveLearningDelta,
} from './payload.ts';
import type { SafeFinalizeNode, TranscriptItem } from './types.ts';

type InterviewRow = {
    id: string;
    user_id: string;
    transcript_json: unknown;
    risk_flags: unknown;
};

type FinalizeServiceResult = {
    interviewId: string;
    resolvedNode: SafeFinalizeNode;
};

export class InterviewFinalizeDomainError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details?: string;

    constructor(params: { message: string; status: number; code: string; details?: string }) {
        super(params.message);
        this.status = params.status;
        this.code = params.code;
        this.details = params.details;
    }
}

export async function fetchInterviewForFinalize(
    admin: SupabaseClient,
    params: { userId: string; interviewId: string | null },
): Promise<InterviewRow> {
    let interviewQuery = admin.from('interviews').select('*').eq('user_id', params.userId);
    if (params.interviewId) {
        interviewQuery = interviewQuery.eq('id', params.interviewId);
    } else {
        interviewQuery = interviewQuery.eq('status', 'IN_PROGRESS').order('created_at', { ascending: false }).limit(1);
    }

    const { data: interview, error: fetchErr } = await interviewQuery.maybeSingle<InterviewRow>();
    if (fetchErr || !interview) {
        throw new InterviewFinalizeDomainError({
            message: 'Interview not found',
            status: 404,
            code: 'INTERVIEW_NOT_FOUND',
            details: fetchErr?.message,
        });
    }

    return interview;
}

export async function finalizeInterviewAndPersist(
    admin: SupabaseClient,
    params: { userId: string; interview: InterviewRow },
): Promise<FinalizeServiceResult> {
    const transcript = Array.isArray(params.interview.transcript_json)
        ? params.interview.transcript_json as TranscriptItem[]
        : [];

    const { data: previousTraitsRow } = await admin
        .from('user_traits')
        .select('traits_json, absolute_score, updated_at')
        .eq('user_id', params.userId)
        .maybeSingle();

    const selfDevSignals = await buildSelfDevelopmentSignals(admin, params.userId, { limit: 40 });

    const { data: verifiedProfile } = await admin
        .from('user_verified_profile')
        .select('*')
        .eq('user_id', params.userId)
        .single();

    const stableSummaryStr = deepStableStringify(verifiedProfile || {});
    const verifiedSummaryHash = ethers.keccak256(ethers.toUtf8Bytes(stableSummaryStr));

    const promptText = buildFinalizePrompt({
        verifiedProfile: (verifiedProfile as Record<string, unknown> | null) || null,
        selfDevelopmentSignals: selfDevSignals as Record<string, unknown>,
        transcript,
    });

    const aiResult = await generateFinalizeNodeWithRetry({
        promptText,
        maxRetries: 1,
        onRetryError: (attempt, error) => {
            console.warn(`JSON Parse or API failed on attempt ${attempt}`, error);
        },
    });

    const grounding = assessGrounding({
        node: aiResult.safeNode,
        transcript,
        verifiedProfile: verifiedProfile || {},
    });
    const grounded = applyGroundingDecisionGuard(aiResult.safeNode, grounding);
    let resolvedNode: SafeFinalizeNode = grounded.resolvedNode as SafeFinalizeNode;

    const learningDelta = deriveLearningDelta({
        previousTraitsRow: (previousTraitsRow as Record<string, unknown> | null) || null,
        resolvedNode,
        groundingCoverage: grounding.coverage,
    });

    const adaptiveRiskFlags = buildAdaptiveRiskFlags(selfDevSignals);
    const combinedRiskFlags = combineRiskFlags({
        existingFlags: params.interview.risk_flags,
        nodeRiskFlags: resolvedNode.risk_flags,
        adaptiveRiskFlags,
    });
    resolvedNode = { ...resolvedNode, risk_flags: combinedRiskFlags };

    const actionPlan = buildDevelopmentActionPlan({
        focusTopics: selfDevSignals.focus_topics,
        riskFlags: combinedRiskFlags,
        receivedReviewAvg: selfDevSignals.received_review_avg,
        scoreDelta: learningDelta.scoreDelta,
        vibeOverlap: learningDelta.vibeOverlap,
    });
    const matchAdjustmentHints = buildMatchAdjustmentHints({
        confidence: selfDevSignals.confidence,
        sampleSize: selfDevSignals.sample_size,
        positiveTags: selfDevSignals.positive_tags,
        frictionTags: selfDevSignals.friction_tags,
        focusTopics: selfDevSignals.focus_topics,
        riskFlags: combinedRiskFlags,
        groundingCoverage: grounding.coverage,
    });

    const analysisJson = buildAnalysisJson({
        resolvedNode,
        verifiedSummaryHash,
        selfDevelopmentSignals: selfDevSignals,
        grounding,
        learningDelta,
        actionPlan,
        matchAdjustmentHints,
    });

    const interviewUpdatePayload = buildInterviewUpdatePayload({
        analysisJson,
        resolvedNode,
        combinedRiskFlags,
        modelVersion: aiResult.modelUsed,
    });

    const { error: interviewError } = await admin
        .from('interviews')
        .update(interviewUpdatePayload)
        .eq('id', params.interview.id);

    if (interviewError) {
        throw new InterviewFinalizeDomainError({
            message: 'DB Update Failed',
            status: 500,
            code: 'DB_UPDATE_FAILED',
            details: interviewError.message,
        });
    }

    if (resolvedNode.decision !== 'REJECT') {
        await admin
            .from('user_traits')
            .upsert(
                buildUserTraitsUpsertPayload({
                    userId: params.userId,
                    analysisJson,
                    resolvedNode,
                    nowIso: new Date().toISOString(),
                }),
            );
    }

    return {
        interviewId: params.interview.id,
        resolvedNode,
    };
}
