import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { systemInstruction, nextQuestionSchema, generateContentWithRetry } from '@/lib/gemini';
import { buildSelfDevelopmentSignals } from '@/lib/server/self-development';
import { isLegacyFlowEnabled } from '@/lib/server/trust';

const REQUIRED_CONSENT_MODULES = ['OSINT', 'LOCATION', 'DEVICE'] as const;
const FOCUS_TOPIC_HINTS: Record<string, string[]> = {
    BASELINE_PREFERENCE: ['좋아', '선호', '취향', '관심', '즐겨'],
    BOUNDARIES_AND_SIGNALING: ['경계', '불편', '시그널', '표현', '거절', '한계'],
    EXPECTATION_ALIGNMENT: ['기대', '맞추', '합의', '조율', '오해'],
    CONFLICT_TRIGGERS: ['갈등', '마찰', '충돌', '스트레스', '트리거'],
    STRENGTH_SIGNAL_CLARITY: ['강점', '장점', '어필', '매력', '차별'],
    SELF_MODEL_RELIABILITY: ['일관', '근거', '증거', '검증', '확신'],
    PROFILE_MAINTENANCE: ['변화', '최근', '업데이트', '유지']
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

type ConsentRow = {
    module: string | null;
    deep_profiling: boolean | null;
};

type InterviewRecord = {
    id: string;
    transcript_json: unknown;
};

type TranscriptItem = {
    role?: string;
    content?: string;
};

function normalizeFingerprint(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 60);
}

function getRecentAssistantQuestions(transcript: TranscriptItem[], limit = 3): string[] {
    return transcript
        .filter((item) => item?.role === 'assistant' && isNonEmptyString(item.content))
        .slice(-limit)
        .map((item) => item.content!.trim());
}

function resolveTopicCoverage(transcript: TranscriptItem[], focusTopics: string[]): {
    covered: string[];
    unresolved: string[];
} {
    if (focusTopics.length === 0) return { covered: [], unresolved: [] };
    const textCorpus = transcript
        .map((item) => (isNonEmptyString(item.content) ? item.content.toLowerCase() : ''))
        .join(' ');

    const covered: string[] = [];
    const unresolved: string[] = [];

    for (const topic of focusTopics) {
        const hints = FOCUS_TOPIC_HINTS[topic] || [];
        const hit = hints.some((keyword) => textCorpus.includes(keyword.toLowerCase()));
        if (hit) {
            covered.push(topic);
        } else {
            unresolved.push(topic);
        }
    }

    return { covered, unresolved };
}

function resolveInterviewTopic(params: {
    explicitTopic: string | null;
    unresolvedTopics: string[];
    focusTopics: string[];
}): string {
    if (params.explicitTopic && params.explicitTopic.trim().length > 0) {
        return params.explicitTopic.trim();
    }
    if (params.unresolvedTopics.length > 0) {
        return params.unresolvedTopics[0];
    }
    if (params.focusTopics.length > 0) {
        return params.focusTopics[0];
    }
    return 'General Introduction';
}

function buildDeterministicFallbackQuestion(topic: string, transcript: TranscriptItem[]): string {
    const templates: Record<string, string> = {
        BASELINE_PREFERENCE: '최근 가장 몰입했던 활동 하나를 고르고, 왜 그 활동이 본인 취향과 맞는지 구체적으로 설명해 주세요.',
        BOUNDARIES_AND_SIGNALING: '관계에서 불편 신호를 느꼈을 때 보통 어떤 방식으로 표현하고 조율하시는지 사례로 말씀해 주세요.',
        EXPECTATION_ALIGNMENT: '상대와 기대가 어긋났던 경험이 있다면, 어떤 기준으로 다시 맞춰갔는지 설명해 주세요.',
        CONFLICT_TRIGGERS: '대화 중 갈등이 생길 때 특히 민감하게 반응하는 포인트가 무엇인지 알려주세요.',
        STRENGTH_SIGNAL_CLARITY: '처음 만나는 사람에게 본인의 강점을 가장 효과적으로 전달했던 방식은 무엇이었나요?',
        SELF_MODEL_RELIABILITY: '본인 성향에 대한 판단이 맞았다고 느낀 근거를 최근 사례 하나로 설명해 주세요.',
        PROFILE_MAINTENANCE: '최근 취향이나 관계 기준에서 달라진 점이 있다면, 그 변화의 이유를 말씀해 주세요.',
    };

    const lastUserAnswer = transcript
        .slice()
        .reverse()
        .find((item) => item?.role === 'user' && isNonEmptyString(item.content))?.content;

    const base = templates[topic] || '최근 답변에서 특히 중요한 부분을 하나 골라, 그 이유를 조금 더 구체적으로 설명해주시겠어요?';
    if (!isNonEmptyString(lastUserAnswer)) return base;
    return `${base} (직전 답변의 맥락: "${lastUserAnswer.slice(0, 80)}")`;
}

export async function POST(request: Request) {
    try {
        if (!isLegacyFlowEnabled()) {
            return NextResponse.json(
                { error: 'LEGACY_FLOW_DISABLED', message: 'Interview hot path is disabled for admission-first mode.' },
                { status: 410 },
            );
        }

        const body = await request.json().catch(() => ({}));
        const interview_id = typeof body.interview_id === 'string' ? body.interview_id : null;
        const last_answer = typeof body.last_answer === 'string' ? body.last_answer.trim() : '';
        const context = typeof body.context === 'object' && body.context
            ? body.context as Record<string, unknown>
            : {};

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const selfDevSignals = await buildSelfDevelopmentSignals(supabaseAdmin, user.id, { limit: 30 });

        // 1. Verify consent. Support both legacy deep_profiling flag and module grants.
        const { data: consents, error: consentError } = await supabase
            .from('consents')
            .select('module, is_granted, deep_profiling')
            .eq('user_id', user.id)
            .eq('is_granted', true);

        if (consentError) {
            return NextResponse.json({ error: 'Failed to validate consent' }, { status: 500 });
        }

        const consentRows = (consents || []) as ConsentRow[];
        const grantedModules = new Set(consentRows.map((item) => item.module));
        const hasAllModules = REQUIRED_CONSENT_MODULES.every((module) => grantedModules.has(module));
        const hasDeepProfiling = consentRows.some((item) => item.deep_profiling === true);

        if (!hasAllModules && !hasDeepProfiling) {
            return NextResponse.json({ error: 'Deep profiling consent required' }, { status: 403 });
        }

        // 2. Resolve interview record: explicit ID -> latest in-progress -> create new
        let interview: InterviewRecord | null = null;

        if (interview_id) {
            const { data } = await supabase
                .from('interviews')
                .select('*')
                .eq('id', interview_id)
                .eq('user_id', user.id)
                .maybeSingle();
            interview = data;

            if (!interview) {
                return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
            }
        } else {
            const { data } = await supabase
                .from('interviews')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'IN_PROGRESS')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            interview = data;

            if (!interview) {
                const { data: createdInterview, error: createError } = await supabaseAdmin
                    .from('interviews')
                    .insert({
                        user_id: user.id,
                        status: 'IN_PROGRESS',
                        transcript_json: []
                    })
                    .select('*')
                    .single();

                if (createError || !createdInterview) {
                    return NextResponse.json({ error: 'Failed to create interview session' }, { status: 500 });
                }
                interview = createdInterview;
            }
        }

        if (!interview) {
            return NextResponse.json({ error: 'Interview session unavailable' }, { status: 500 });
        }

        const transcript = Array.isArray(interview.transcript_json)
            ? [...(interview.transcript_json as TranscriptItem[])]
            : [];

        if (isNonEmptyString(last_answer)) {
            transcript.push({ role: 'user', content: last_answer });
            const userTranscriptUpdate = await supabaseAdmin
                .from('interviews')
                .update({ transcript_json: transcript })
                .eq('id', interview.id);
            if (userTranscriptUpdate.error) {
                return NextResponse.json(
                    { error: 'Failed to persist user answer' },
                    { status: 500 }
                );
            }
        }

        // 3. Generate the next question with Gemini
        // We instruct Gemini to act as the interviewer and ask the next logical deep profiling question.
        const explicitTopic = isNonEmptyString(context.topic) ? context.topic : null;
        const recentAssistantQuestions = getRecentAssistantQuestions(transcript, 3);
        const questionFingerprints = recentAssistantQuestions.map(normalizeFingerprint);
        const { covered, unresolved } = resolveTopicCoverage(transcript, selfDevSignals.focus_topics);

        const resolvedContextTopic = resolveInterviewTopic({
            explicitTopic,
            unresolvedTopics: unresolved,
            focusTopics: selfDevSignals.focus_topics
        });

        const interviewMemory = {
            transcript_turns: transcript.length,
            recent_assistant_questions: recentAssistantQuestions,
            recent_question_fingerprints: questionFingerprints,
            focus_topics_all: selfDevSignals.focus_topics,
            focus_topics_covered: covered,
            focus_topics_unresolved: unresolved,
        };

        const promptText = `
${systemInstruction}
You are an AI deep profiling agent. Your goal is to extract core traits, preferences, and "why" they like those things.
Current context/topic: ${resolvedContextTopic}
Past transcript:
${JSON.stringify(transcript, null, 2)}

[SELF_DEVELOPMENT_SIGNALS]
${JSON.stringify(selfDevSignals, null, 2)}

[INTERVIEW_MEMORY]
${JSON.stringify(interviewMemory, null, 2)}

Based on the latest answer, generate the *next* logical question to dig deeper into their personality or transition to a new topic (books, movies, exercise, MBTI if they mention it).
Prioritize focus_topics_unresolved from INTERVIEW_MEMORY when transcript evidence is weak.
Do not repeat opener/pattern from recent_question_fingerprints.
When possible, ask for one concrete past behavior example instead of abstract preference only.
Do not assert or assume facts that are not present in transcript.
Keep your question conversational but analytical. Output strictly following the provided JSON schema.
        `;

        const { response } = await generateContentWithRetry(promptText, nextQuestionSchema);

        const resultJsonString = response.text || '{}';
        const parsedNode = JSON.parse(resultJsonString || '{}') as {
            next_question?: unknown;
            topic?: unknown;
            rationale_short?: unknown;
            progress?: { done?: unknown; total?: unknown } | null;
        };

        const fallbackQuestion = buildDeterministicFallbackQuestion(resolvedContextTopic, transcript);
        const next_question = isNonEmptyString(parsedNode.next_question)
            ? parsedNode.next_question
            : fallbackQuestion;
        const topic = isNonEmptyString(parsedNode.topic)
            ? parsedNode.topic
            : resolvedContextTopic;
        const rationale_short = isNonEmptyString(parsedNode.rationale_short)
            ? parsedNode.rationale_short
            : `FOLLOW_UP_${resolvedContextTopic}`;

        const userAnswerCount = transcript.filter((item) => item?.role === 'user').length;
        const inferredTotal = Math.max(5, Math.min(10, selfDevSignals.focus_topics.length + 4));
        const safeProgress =
            typeof parsedNode.progress?.done === 'number' && typeof parsedNode.progress?.total === 'number'
                ? parsedNode.progress
                : { done: Math.min(userAnswerCount + 1, inferredTotal), total: inferredTotal };

        // Append the AI's question to the transcript
        transcript.push({ role: 'assistant', content: next_question });
        const assistantTranscriptUpdate = await supabaseAdmin
            .from('interviews')
            .update({ transcript_json: transcript })
            .eq('id', interview.id);
        if (assistantTranscriptUpdate.error) {
            return NextResponse.json(
                { error: 'Failed to persist next question' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            stage: 'QUESTION',
            next_question,
            topic,
            rationale_short,
            progress: safeProgress,
            interview_id: interview.id
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Interview Next Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
