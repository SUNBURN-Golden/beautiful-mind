import { sleep } from './common.mjs';

export const evaluateMatchSchema = {
    type: 'OBJECT',
    properties: {
        predicted_score: { type: 'NUMBER' },
        confidence: { type: 'NUMBER' },
        evidence: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    field_path: { type: 'STRING' },
                    value: { type: 'STRING' },
                    why_tag: { type: 'STRING' },
                },
                required: ['field_path', 'value', 'why_tag'],
            },
        },
    },
    required: ['predicted_score', 'confidence', 'evidence'],
};

const DEFAULT_SYSTEM_INSTRUCTION =
    '반드시 JSON 스키마만 출력할 것. evidence.field_path는 입력의 ALLOWED_FIELD_PATHS에 존재하는 경로만 사용하고, 없는 사실을 만들지 말 것. 불확실하면 predicted_score=3 근처, confidence는 낮게 반환할 것.';

export function createPredictScoreWithRetry(options) {
    const {
        ai,
        maxRetries = 1,
        primaryModel = 'gemini-2.5-flash',
        fallbackModel = 'gemini-2.0-flash',
        schema = evaluateMatchSchema,
        systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
        fallbackMock = {
            predicted_score: 4.0,
            confidence: 0.55,
            evidence: [{ field_path: 'categorical.location_region', value: 'N/A', why_tag: '지역 기반 친화도' }],
        },
    } = options || {};

    async function predictScoreWithRetry(prompt, retries = 0) {
        let currentModel = retries > 0 ? fallbackModel : primaryModel;
        if (!ai) {
            return {
                data: fallbackMock,
                model: 'mock-model-v2',
            };
        }

        try {
            const response = await ai.models.generateContent({
                model: currentModel,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    systemInstruction,
                },
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

            if (isRetryable && retries < maxRetries) {
                await sleep(800 + Math.random() * 200);
                return predictScoreWithRetry(prompt, retries + 1);
            }
            throw err;
        }
    }

    return predictScoreWithRetry;
}
