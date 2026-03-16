export type FinalizeRequestInput = {
    interview_id: string | null;
    final_answer: string | null;
};

export function parseFinalizeRequestBody(body: unknown): FinalizeRequestInput {
    const source = body && typeof body === 'object'
        ? body as Record<string, unknown>
        : {};

    return {
        interview_id: typeof source.interview_id === 'string' && source.interview_id.trim().length > 0
            ? source.interview_id
            : null,
        final_answer: typeof source.final_answer === 'string'
            ? source.final_answer
            : null,
    };
}
