import type { SupabaseClient } from '@supabase/supabase-js';
import { isAdmissionDocumentType } from './admission-core.ts';
import { executeAdmissionDecision } from './admission-decision-engine/execution';
import { getReviewQueueType } from './admin-review-queue.ts';
import { RouteServiceError } from './route-service-error';
import { persistAdminReviewDecisionEffects } from './admin-review-decision-effects.ts';
import {
    createColdPathDecisionRun,
    fetchReviewCaseForDecision,
    mapAdminReviewDecision,
    sourceFromQueue,
} from './admin-review-decision-run.ts';

export type AdminReviewDecisionInput = {
    reviewCaseId: string;
    decision: 'APPROVE' | 'REJECT' | 'RESUBMIT' | 'RESUBMIT_REQUIRED';
    reviewerNotes: string;
    rejectionReasonCode: string;
    resubmitDocumentTypes: string[];
    resolutionType: string;
    actorUserId: string | null;
    actorRole: 'ADMIN' | 'CRON';
};

export async function executeAdminReviewDecision(
    admin: SupabaseClient,
    input: AdminReviewDecisionInput,
) {
    const nowIso = new Date().toISOString();
    const mappedDecision = mapAdminReviewDecision(input.decision);
    const reviewCase = await fetchReviewCaseForDecision(admin, input.reviewCaseId);

    const queueType = getReviewQueueType(reviewCase.ai_summary_json);
    if (queueType === 'UNKNOWN') {
        throw new RouteServiceError(
            'HOT_PATH_DECISION_BLOCKED',
            409,
            'Admin decisions are allowed only for APPEAL/EXCEPTION/AUDIT/POLICY_OVERRIDE queues.',
        );
    }

    const coldRun = await createColdPathDecisionRun(admin, {
        reviewCase,
        queueType,
        mappedDecision,
        reviewerNotes: input.reviewerNotes,
        rejectionReasonCode: input.rejectionReasonCode,
        resolutionType: input.resolutionType,
        nowIso,
    });

    const resubmitDocumentTypes = input.resubmitDocumentTypes
        .filter((value): value is string => isAdmissionDocumentType(value));

    const result = await executeAdmissionDecision(admin, {
        applicationId: reviewCase.admission_application_id,
        userId: reviewCase.user_id,
        decision: mappedDecision,
        reasonCode: input.rejectionReasonCode || `COLD_PATH_${mappedDecision}`,
        confidenceScore: 1,
        anomalyFlags: ['COLD_PATH_REVIEW'],
        escalationReasonCode: queueType,
        decisionRunId: coldRun.id,
        resubmitDocumentTypes,
        actor: {
            actorUserId: input.actorUserId,
            actorRole: input.actorRole,
            source: sourceFromQueue(queueType),
        },
        decisionNotes: input.reviewerNotes || `COLD_PATH_${queueType}`,
    });

    await persistAdminReviewDecisionEffects(admin, {
        reviewCase,
        queueType,
        mappedDecision,
        decisionRunId: coldRun.id,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        reviewerNotes: input.reviewerNotes,
        rejectionReasonCode: input.rejectionReasonCode,
        resolutionType: input.resolutionType,
        resubmitDocumentTypes,
        nowIso,
    });

    return {
        queue_type: queueType,
        decision: mappedDecision,
        decision_run_id: coldRun.id,
        application_status: result.applicationStatus,
        next_step: result.nextStep,
        soul_credential_id: result.soulCredentialId,
        resubmit_document_types: result.resubmitDocumentTypes,
        exception_case_id: result.exceptionCaseId,
        review_case_id: reviewCase.id,
    };
}
