import type { SupabaseClient } from '@supabase/supabase-js';
import { getReviewQueueLinkedIds } from './admin-review-queue.ts';

export async function updateLinkedQueueRecords(
    admin: SupabaseClient,
    linkedIds: ReturnType<typeof getReviewQueueLinkedIds>,
    params: {
        actorUserId: string | null;
        decision: 'APPROVE' | 'REJECT' | 'RESUBMIT_REQUIRED';
        reviewerNotes: string;
        resolutionType: string;
        nowIso: string;
    },
) {
    if (linkedIds.appealId) {
        await admin
            .from('appeals')
            .update({
                status: params.decision === 'APPROVE' ? 'RESOLVED_OVERTURNED' : 'RESOLVED_UPHELD',
                resolved_at: params.nowIso,
                resolved_by: params.actorUserId,
                resolution_type: params.resolutionType || (params.decision === 'APPROVE' ? 'OVERTURNED' : 'UPHELD'),
                resolution_notes: params.reviewerNotes || null,
            })
            .eq('id', linkedIds.appealId);
    }

    if (linkedIds.exceptionCaseId) {
        const exceptionStatus = params.decision === 'APPROVE'
            ? 'RESOLVED_APPROVE'
            : params.decision === 'REJECT'
                ? 'RESOLVED_REJECT'
                : 'RESOLVED_RESUBMIT';

        await admin
            .from('exception_cases')
            .update({
                status: exceptionStatus,
                resolved_at: params.nowIso,
                resolved_by: params.actorUserId,
                resolution_notes: params.reviewerNotes || null,
            })
            .eq('id', linkedIds.exceptionCaseId);
    }

    if (linkedIds.sampleId) {
        await admin
            .from('audit_samples')
            .update({
                status: 'RESOLVED',
                reviewed_at: params.nowIso,
                reviewed_by: params.actorUserId,
                outcome: params.resolutionType === 'OVERTURNED' ? 'OVERTURNED' : 'CONFIRMED',
                resolution_notes: params.reviewerNotes || null,
            })
            .eq('id', linkedIds.sampleId);
    }
}
