import type { SupabaseClient } from '@supabase/supabase-js';
import { getReviewQueueLinkedIds, type QueueType } from './admin-review-queue.ts';
import { updateLinkedQueueRecords } from './admin-review-queue-effects.ts';
import type { AdminReviewMappedDecision, ReviewCaseForDecision } from './admin-review-decision-run.ts';

type PersistAdminReviewDecisionEffectsParams = {
    reviewCase: ReviewCaseForDecision;
    queueType: QueueType;
    mappedDecision: AdminReviewMappedDecision;
    decisionRunId: string;
    actorUserId: string | null;
    actorRole: 'ADMIN' | 'CRON';
    reviewerNotes: string;
    rejectionReasonCode: string;
    resolutionType: string;
    resubmitDocumentTypes: string[];
    nowIso: string;
};

export async function persistAdminReviewDecisionEffects(
    admin: SupabaseClient,
    params: PersistAdminReviewDecisionEffectsParams,
): Promise<void> {
    await admin
        .from('review_cases')
        .update({
            state: params.mappedDecision === 'APPROVE'
                ? 'APPROVED'
                : params.mappedDecision === 'REJECT'
                    ? 'REJECTED'
                    : 'RESUBMIT_REQUIRED',
            decided_at: params.nowIso,
            decided_by: params.actorUserId,
            reviewer_notes: params.reviewerNotes || `${params.queueType}:${params.mappedDecision}`,
        })
        .eq('id', params.reviewCase.id);

    await admin
        .from('review_case_events')
        .insert({
            review_case_id: params.reviewCase.id,
            actor_user_id: params.actorUserId,
            actor_role: params.actorRole,
            event_type: 'COLD_PATH_DECISION_EXECUTED',
            payload: {
                queue_type: params.queueType,
                decision: params.mappedDecision,
                decision_run_id: params.decisionRunId,
                rejection_reason_code: params.rejectionReasonCode || null,
                resubmit_document_types: params.resubmitDocumentTypes,
                reviewer_notes: params.reviewerNotes,
                decided_at: params.nowIso,
            },
        });

    await updateLinkedQueueRecords(admin, getReviewQueueLinkedIds(params.reviewCase.ai_summary_json), {
        actorUserId: params.actorUserId,
        decision: params.mappedDecision,
        reviewerNotes: params.reviewerNotes,
        resolutionType: params.resolutionType,
        nowIso: params.nowIso,
    });
}
