import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { systemInstruction, finalizeSchema, generateContentWithRetry } from '@/lib/gemini';
import { buildSelfDevelopmentSignals } from '@/lib/server/self-development';
import { assessGrounding, applyGroundingDecisionGuard } from '@/lib/server/interview-grounding';
import { ethers } from 'ethers';

type FinalizeNode = {
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

type SafeFinalizeNode = {
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

type DevelopmentAction = {
    action_id: string;
    title: string;
    reason: string;
    metric: string;
    target: string;
    horizon_days: number;
    priority: 'P0' | 'P1' | 'P2';
};

type MatchAdjustmentHints = {
    exploration_bias: 'LOW' | 'NORMAL' | 'HIGH';
    confidence_weight_override: number;
    avoid_tags: string[];
    prefer_tags: string[];
    focus_topics: string[];
    risk_flags: string[];
};

type TranscriptItem = {
    role?: string;
    content?: string;
};

const FALLBACK_FINALIZE_NODE: SafeFinalizeNode = {
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

function normalizeFinalizeNode(node: FinalizeNode | null): SafeFinalizeNode {
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

function deepStableStringify(obj: unknown): string {
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

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
}

function tagOverlapRatio(source: string[], target: string[]): number | null {
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

function buildDevelopmentActionPlan(params: {
    focusTopics: string[];
    riskFlags: string[];
    receivedReviewAvg: number | null;
    scoreDelta: number | null;
    vibeOverlap: number | null;
}): DevelopmentAction[] {
    const actions: DevelopmentAction[] = [];
    const seen = new Set<string>();

    const pushAction = (next: DevelopmentAction) => {
        if (seen.has(next.action_id)) return;
        seen.add(next.action_id);
        actions.push(next);
    };

    const topicActionMap: Record<string, DevelopmentAction> = {
        BOUNDARIES_AND_SIGNALING: {
            action_id: 'BOUNDARY_SIGNAL_SCRIPT',
            title: '경계 신호 스크립트 정리',
            reason: '불편 신호를 빠르게 전달하는 문장을 고정하면 초기 마찰을 줄일 수 있습니다.',
            metric: '초기 대화 불편 이벤트 발생률',
            target: '2주 내 20% 감소',
            horizon_days: 14,
            priority: 'P1',
        },
        EXPECTATION_ALIGNMENT: {
            action_id: 'EXPECTATION_ALIGNMENT_CHECK',
            title: '초기 기대치 체크 질문 고정',
            reason: '상대와 기준 불일치가 누적되기 전에 기대치를 명시적으로 조율합니다.',
            metric: '첫 3회 대화 내 기준 합의 여부',
            target: '매칭의 80% 이상 합의 확인',
            horizon_days: 14,
            priority: 'P1',
        },
        CONFLICT_TRIGGERS: {
            action_id: 'TRIGGER_LOG',
            title: '갈등 트리거 로그 작성',
            reason: '갈등 유발 상황을 기록하면 반복되는 패턴을 빠르게 차단할 수 있습니다.',
            metric: '반복 트리거 재발률',
            target: '30일 내 30% 감소',
            horizon_days: 30,
            priority: 'P1',
        },
        STRENGTH_SIGNAL_CLARITY: {
            action_id: 'STRENGTH_SIGNAL_REWRITE',
            title: '강점 시그널 문장 재작성',
            reason: '본인 강점이 구체적으로 드러나면 상호 호감 초기 형성률이 상승합니다.',
            metric: '긍정 태그 비율',
            target: '다음 10건 리뷰에서 +15%',
            horizon_days: 21,
            priority: 'P2',
        },
        SELF_MODEL_RELIABILITY: {
            action_id: 'SELF_MODEL_EVIDENCE',
            title: '자기인식 근거 보강',
            reason: '자기 진단 근거가 약하면 인터뷰 결과와 실제 상호작용 간 편차가 커집니다.',
            metric: '인터뷰-리뷰 일치도',
            target: '다음 인터뷰에서 일치도 0.2p 상승',
            horizon_days: 21,
            priority: 'P0',
        },
    };

    for (const topic of params.focusTopics) {
        const mapped = topicActionMap[topic];
        if (mapped) pushAction(mapped);
    }

    if (params.riskFlags.includes('LOW_RECIPROCITY_FEEDBACK') || (params.receivedReviewAvg !== null && params.receivedReviewAvg < 2.6)) {
        pushAction({
            action_id: 'RECIPROCITY_REPAIR',
            title: '상호성 피드백 복구',
            reason: '상대 만족도 하락 신호가 누적되어 high-trust 승급 경로에서 리스크가 커진 상태입니다.',
            metric: '받은 리뷰 평균 점수',
            target: '다음 8건에서 3.2 이상 회복',
            horizon_days: 30,
            priority: 'P0',
        });
    }

    if (params.riskFlags.includes('LOW_BEHAVIORAL_CONFIDENCE')) {
        pushAction({
            action_id: 'LOW_CONFIDENCE_DATA_BOOTSTRAP',
            title: '행동 데이터 샘플 확보',
            reason: '샘플 수와 최신성이 부족해 예측 신뢰도가 낮습니다.',
            metric: 'self-development confidence',
            target: '0.55 이상',
            horizon_days: 21,
            priority: 'P0',
        });
    }

    if (params.scoreDelta !== null && params.scoreDelta <= -8) {
        pushAction({
            action_id: 'SCORE_DRIFT_REVIEW',
            title: '인터뷰 점수 드리프트 점검',
            reason: '직전 인터뷰 대비 절대 점수가 큰 폭으로 하락했습니다.',
            metric: 'score delta',
            target: '다음 인터뷰에서 -3 이내',
            horizon_days: 14,
            priority: 'P1',
        });
    }

    if (params.vibeOverlap !== null && params.vibeOverlap < 0.2) {
        pushAction({
            action_id: 'VIBE_CONSISTENCY',
            title: '바이브 태그 일관성 점검',
            reason: '연속 인터뷰의 vibe tag 겹침이 낮아 자기 모델 일관성이 떨어집니다.',
            metric: 'vibe overlap',
            target: '다음 인터뷰 0.35 이상',
            horizon_days: 21,
            priority: 'P2',
        });
    }

    const priorityRank: Record<DevelopmentAction['priority'], number> = { P0: 0, P1: 1, P2: 2 };
    return actions
        .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
        .slice(0, 5);
}

function buildMatchAdjustmentHints(params: {
    confidence: number;
    sampleSize: number;
    positiveTags: string[];
    frictionTags: string[];
    focusTopics: string[];
    riskFlags: string[];
    groundingCoverage: number;
}): MatchAdjustmentHints {
    const severeFlags = ['LOW_RECIPROCITY_FEEDBACK', 'LOW_BEHAVIORAL_CONFIDENCE'];
    const hasSevereFlag = params.riskFlags.some((flag) => severeFlags.includes(flag));

    let explorationBias: MatchAdjustmentHints['exploration_bias'] = 'NORMAL';
    if (hasSevereFlag || params.confidence < 0.45 || params.sampleSize < 6 || params.groundingCoverage < 0.65) {
        explorationBias = 'HIGH';
    } else if (params.confidence > 0.78 && params.sampleSize >= 16 && params.groundingCoverage >= 0.8) {
        explorationBias = 'LOW';
    }

    const confidenceWeightOverride = Number(
        Math.max(
            0.75,
            Math.min(
                1.15,
                (0.85 + (params.confidence * 0.3)) -
                (hasSevereFlag ? 0.08 : 0) -
                (params.groundingCoverage < 0.65 ? 0.1 : 0)
            )
        ).toFixed(3)
    );

    return {
        exploration_bias: explorationBias,
        confidence_weight_override: confidenceWeightOverride,
        avoid_tags: params.frictionTags.slice(0, 6),
        prefer_tags: params.positiveTags.slice(0, 6),
        focus_topics: params.focusTopics.slice(0, 4),
        risk_flags: params.riskFlags.filter((flag) => severeFlags.includes(flag)),
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { interview_id, final_answer } = body;

        console.log('[SERVER DEBUG] Interview Finalize hit', { interview_id, has_answer: !!final_answer });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[SERVER DEBUG] Unauthorized access to finalize');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch the interview (auto-find if ID missing)
        let interview_query = supabaseAdmin.from('interviews').select('*').eq('user_id', user.id);
        if (interview_id) {
            interview_query = interview_query.eq('id', interview_id);
        } else {
            interview_query = interview_query.eq('status', 'IN_PROGRESS').order('created_at', { ascending: false }).limit(1);
        }

        const { data: interview, error: fetchErr } = await interview_query.maybeSingle();

        if (fetchErr || !interview) {
            console.log('[SERVER DEBUG] Interview not found', { user_id: user.id });
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        const transcript = Array.isArray(interview.transcript_json)
            ? interview.transcript_json as TranscriptItem[]
            : [];
        console.log('[SERVER DEBUG] Starting Gemini Finalization...', { transcript_len: transcript.length });

        const { data: previousTraitsRow } = await supabaseAdmin
            .from('user_traits')
            .select('traits_json, absolute_score, updated_at')
            .eq('user_id', user.id)
            .maybeSingle();

        const selfDevSignals = await buildSelfDevelopmentSignals(supabaseAdmin, user.id, { limit: 40 });

        // Fetch PII-Free User Verified Profile for the Subject
        const { data: verifiedProfile } = await supabaseAdmin
            .from('user_verified_profile')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const stableSummaryStr = deepStableStringify(verifiedProfile || {});
        const verifiedSummaryHash = ethers.keccak256(ethers.toUtf8Bytes(stableSummaryStr));

        // Call Gemini to Finalize
        const promptText = `
${systemInstruction}
You must analyze the following interview transcript and evaluate the user strictly against the output schema.
Extract raw preferences (books, movies, exercises) and derived traits. 
Do NOT guess MBTI unless the user explicitly stated it.
If evidence is weak, set decision to REVIEW and include risk_flags about low confidence.
Never invent facts that are not grounded in transcript or VERIFIED_SUMMARY.
Output valid JSON only.

[VERIFIED_SUMMARY]
${JSON.stringify(verifiedProfile || {}, null, 2)}

[SELF_DEVELOPMENT_SIGNALS]
${JSON.stringify(selfDevSignals, null, 2)}

[USER_INTERVIEW_DATA]
Transcript:
${JSON.stringify(transcript, null, 2)}
        `;

        let parsedNode: FinalizeNode | null = null;
        let retryCount = 0;
        const maxRetries = 1;
        let finalModel = 'gemini-2.5-flash';

        while (retryCount <= maxRetries) {
            try {
                const { response, modelUsed } = await generateContentWithRetry(promptText, finalizeSchema);
                finalModel = modelUsed;

                parsedNode = JSON.parse(response.text || '{}');
                break; // If parse succeeds, break out of loop
            } catch (err: unknown) {
                console.warn(`JSON Parse or API failed on attempt ${retryCount + 1}`, err);
                retryCount++;
                if (retryCount > maxRetries) {
                    parsedNode = {
                        stage: "FINAL",
                        decision: "REVIEW",
                        score: 0,
                        risk_flags: ["JSON_PARSE_FAIL"],
                        summary: "Failed to parse final AI output.",
                        absolute_score: 0,
                        raw_preferences: { books: [], movies: [], exercise: [], mbti: { self_reported: false, type: null } },
                        derived_traits: { intellectual_complexity: "MEDIUM", stimulation_seeking: "MODERATE", discipline_level: "MEDIUM", social_energy: "AMBIVERT", vibe_tags: [] }
                    };
                }
            }
        }

        const safeNode = normalizeFinalizeNode(parsedNode);
        const grounding = assessGrounding({
            node: safeNode,
            transcript,
            verifiedProfile: verifiedProfile || {},
        });
        const grounded = applyGroundingDecisionGuard(safeNode, grounding);
        let resolvedNode: SafeFinalizeNode = grounded.resolvedNode as SafeFinalizeNode;

        const previousAbsolute = typeof previousTraitsRow?.absolute_score === 'number'
            ? previousTraitsRow.absolute_score
            : null;
        const previousGroundingCoverage = (
            previousTraitsRow?.traits_json &&
            typeof previousTraitsRow.traits_json === 'object' &&
            (previousTraitsRow.traits_json as Record<string, unknown>).self_development &&
            typeof (previousTraitsRow.traits_json as Record<string, unknown>).self_development === 'object' &&
            ((previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding &&
            typeof ((previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding === 'object'
        )
            ? (((previousTraitsRow.traits_json as Record<string, unknown>).self_development as Record<string, unknown>).grounding as Record<string, unknown>).coverage
            : null;
        const previousGrounding = typeof previousGroundingCoverage === 'number'
            ? previousGroundingCoverage
            : null;
        const previousVibeTags = toStringArray(
            (previousTraitsRow?.traits_json as Record<string, unknown> | null)?.derived_traits
                && typeof (previousTraitsRow?.traits_json as Record<string, unknown>).derived_traits === 'object'
                ? ((previousTraitsRow?.traits_json as Record<string, unknown>).derived_traits as Record<string, unknown>).vibe_tags
                : []
        );
        const currentVibeTags = toStringArray(
            resolvedNode.derived_traits && typeof resolvedNode.derived_traits === 'object'
                ? (resolvedNode.derived_traits as Record<string, unknown>).vibe_tags
                : []
        );
        const vibeOverlap = tagOverlapRatio(previousVibeTags, currentVibeTags);
        const scoreDelta = previousAbsolute === null
            ? null
            : (resolvedNode.absolute_score - previousAbsolute);
        const groundingDelta = previousGrounding === null
            ? null
            : Number((grounding.coverage - previousGrounding).toFixed(3));

        const adaptiveRiskFlags: string[] = [];
        if (selfDevSignals.sample_size >= 8 && selfDevSignals.received_review_avg !== null && selfDevSignals.received_review_avg < 2.6) {
            adaptiveRiskFlags.push('LOW_RECIPROCITY_FEEDBACK');
        }
        if (selfDevSignals.confidence < 0.35) {
            adaptiveRiskFlags.push('LOW_BEHAVIORAL_CONFIDENCE');
        }

        // Combine existing risk flags with parsed flags
        const existingFlags = Array.isArray(interview.risk_flags)
            ? interview.risk_flags.filter((flag: unknown): flag is string => typeof flag === 'string')
            : [];
        const newFlags = Array.isArray(resolvedNode.risk_flags) ? resolvedNode.risk_flags : [];
        const combinedRiskFlags = Array.from(new Set([...existingFlags, ...newFlags, ...adaptiveRiskFlags]));
        resolvedNode = { ...resolvedNode, risk_flags: combinedRiskFlags };

        const actionPlan = buildDevelopmentActionPlan({
            focusTopics: selfDevSignals.focus_topics,
            riskFlags: combinedRiskFlags,
            receivedReviewAvg: selfDevSignals.received_review_avg,
            scoreDelta,
            vibeOverlap,
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

        // Format for DB Upsert
        const analysisJson: Record<string, unknown> = {
            raw_preferences: resolvedNode.raw_preferences,
            derived_traits: resolvedNode.derived_traits,
            stage: resolvedNode.stage,
            verification_consistency: resolvedNode.verification_consistency || 'UNKNOWN',
            verification_conflicts: resolvedNode.verification_conflicts || [],
            verified_summary_hash_keccak: verifiedSummaryHash,
            self_development: {
                ...selfDevSignals,
                learning_delta: {
                    score_delta_from_previous_interview: scoreDelta,
                    vibe_overlap_with_previous_interview: vibeOverlap,
                    grounding_delta_from_previous_interview: groundingDelta,
                    previous_grounding_coverage: previousGrounding,
                    previous_traits_updated_at: previousTraitsRow?.updated_at ?? null,
                },
                grounding,
                action_plan: actionPlan,
                match_adjustment_hints: matchAdjustmentHints,
            },
        };

        // 1. Update interviews table (using admin client)
        const { error: interviewError } = await supabaseAdmin
            .from('interviews')
                .update({
                    analysis_json: analysisJson,
                    decision: resolvedNode.decision,
                    absolute_score: resolvedNode.absolute_score || resolvedNode.score, // Handle dual mapping
                    score: resolvedNode.score,
                    risk_flags: combinedRiskFlags,
                    summary: resolvedNode.summary,
                    model_version: finalModel,
                    status: 'DONE'
                })
            .eq('id', interview.id);

        if (interviewError) {
            console.error('Failed to update interview:', interviewError);
            return NextResponse.json({ error: 'DB Update Failed', details: interviewError.message }, { status: 500 });
        }

        // 2. Upsert user_traits table (matching cache)  (using admin client) -> Service Role Write Only
        if (resolvedNode.decision !== 'REJECT') {
            await supabaseAdmin
                .from('user_traits')
                .upsert({
                    user_id: user.id,
                    traits_json: analysisJson,
                    absolute_score: resolvedNode.absolute_score || resolvedNode.score,
                    updated_at: new Date().toISOString()
                });
        }

        console.log('[SERVER DEBUG] Interview Finalized Successfully', { interview_id: interview.id });
        return NextResponse.json(resolvedNode);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Interview Finalize Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
