import { finalizeSchema, generateContentWithRetry, systemInstruction } from '@/lib/gemini';
import { FALLBACK_FINALIZE_NODE, normalizeFinalizeNode, parseFinalizeNodeText } from './normalize.ts';
import type { FinalizeAiResult, SafeFinalizeNode, TranscriptItem } from './types.ts';

export function buildFinalizePrompt(params: {
    verifiedProfile: Record<string, unknown> | null;
    selfDevelopmentSignals: Record<string, unknown>;
    transcript: TranscriptItem[];
}): string {
    return `
${systemInstruction}
You must analyze the following interview transcript and evaluate the user strictly against the output schema.
Extract raw preferences (books, movies, exercises) and derived traits.
Do NOT guess MBTI unless the user explicitly stated it.
If evidence is weak, set decision to REVIEW and include risk_flags about low confidence.
Never invent facts that are not grounded in transcript or VERIFIED_SUMMARY.
Output valid JSON only.

[VERIFIED_SUMMARY]
${JSON.stringify(params.verifiedProfile || {}, null, 2)}

[SELF_DEVELOPMENT_SIGNALS]
${JSON.stringify(params.selfDevelopmentSignals, null, 2)}

[USER_INTERVIEW_DATA]
Transcript:
${JSON.stringify(params.transcript, null, 2)}
        `;
}

export async function generateFinalizeNodeWithRetry(params: {
    promptText: string;
    maxRetries?: number;
    onRetryError?: (attempt: number, error: unknown) => void;
}): Promise<FinalizeAiResult> {
    const maxRetries = typeof params.maxRetries === 'number' ? params.maxRetries : 1;
    let retryCount = 0;
    let modelUsed = 'gemini-2.5-flash';
    let safeNode: SafeFinalizeNode | null = null;

    while (retryCount <= maxRetries) {
        try {
            const response = await generateContentWithRetry(params.promptText, finalizeSchema);
            modelUsed = response.modelUsed;
            const parsedNode = parseFinalizeNodeText(response.response.text || '{}');
            safeNode = normalizeFinalizeNode(parsedNode);
            break;
        } catch (error: unknown) {
            if (params.onRetryError) {
                params.onRetryError(retryCount + 1, error);
            }
            retryCount += 1;
            if (retryCount > maxRetries) {
                safeNode = FALLBACK_FINALIZE_NODE;
            }
        }
    }

    return {
        safeNode: safeNode || FALLBACK_FINALIZE_NODE,
        modelUsed,
        parseFailed: (safeNode || FALLBACK_FINALIZE_NODE).risk_flags.includes('JSON_PARSE_FAIL'),
    };
}
