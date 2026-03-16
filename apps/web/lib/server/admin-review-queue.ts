export type QueueType = 'APPEAL' | 'EXCEPTION' | 'AUDIT' | 'POLICY_OVERRIDE' | 'UNKNOWN';

export type QueueLinkedIds = {
    appealId: string | null;
    exceptionCaseId: string | null;
    sampleId: string | null;
};

export function getReviewQueueType(aiSummary: unknown): QueueType {
    if (!aiSummary || typeof aiSummary !== 'object') return 'UNKNOWN';
    const queueType = (aiSummary as Record<string, unknown>).queue_type;
    if (queueType === 'APPEAL') return 'APPEAL';
    if (queueType === 'EXCEPTION') return 'EXCEPTION';
    if (queueType === 'AUDIT') return 'AUDIT';
    if (queueType === 'POLICY_OVERRIDE') return 'POLICY_OVERRIDE';
    return 'UNKNOWN';
}

export function getReviewQueueLinkedIds(aiSummary: unknown): QueueLinkedIds {
    const summary = (aiSummary || {}) as Record<string, unknown>;
    return {
        appealId: typeof summary.appeal_id === 'string' ? summary.appeal_id : null,
        exceptionCaseId: typeof summary.exception_case_id === 'string' ? summary.exception_case_id : null,
        sampleId: typeof summary.sample_id === 'string' ? summary.sample_id : null,
    };
}
