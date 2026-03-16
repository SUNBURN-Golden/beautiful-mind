import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMISSION_POLICY_VERSION } from './admission-core.ts';
import { RouteServiceError } from './route-service-error';
import type { QueueType } from './admin-review-queue.ts';

export type AdminReviewMappedDecision = 'APPROVE' | 'REJECT' | 'RESUBMIT_REQUIRED';

export type ReviewCaseForDecision = {
    id: string;
    admission_application_id: string;
    user_id: string;
    ai_summary_json: Record<string, unknown> | null;
};

function snapshotHash(payload: Record<string, unknown>) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function mapAdminReviewDecision(raw: string): AdminReviewMappedDecision {
    if (raw === 'RESUBMIT') return 'RESUBMIT_REQUIRED';
    return raw as AdminReviewMappedDecision;
}

export function sourceFromQueue(queueType: QueueType) {
    if (queueType === 'APPEAL') return 'APPEAL_REVIEW' as const;
    if (queueType === 'EXCEPTION') return 'EXCEPTION_REVIEW' as const;
    if (queueType === 'AUDIT') return 'AUDIT_REVIEW' as const;
    return 'POLICY_OVERRIDE' as const;
}

export function reviewStateFromDecision(decision: AdminReviewMappedDecision) {
    if (decision === 'APPROVE') return 'APPROVED' as const;
    if (decision === 'REJECT') return 'REJECTED' as const;
    return 'RESUBMIT_REQUIRED' as const;
}

export async function fetchReviewCaseForDecision(
    admin: SupabaseClient,
    reviewCaseId: string,
): Promise<ReviewCaseForDecision> {
    const { data: reviewCase, error: reviewCaseError } = await admin
        .from('review_cases')
        .select('id,admission_application_id,user_id,ai_summary_json')
        .eq('id', reviewCaseId)
        .maybeSingle<ReviewCaseForDecision>();

    if (reviewCaseError) {
        throw new RouteServiceError('REVIEW_CASE_LOOKUP_FAILED', 500, reviewCaseError.message);
    }

    if (!reviewCase) {
        throw new RouteServiceError('REVIEW_CASE_NOT_FOUND', 404, 'review case not found');
    }

    return reviewCase;
}

export async function createColdPathDecisionRun(
    admin: SupabaseClient,
    params: {
        reviewCase: ReviewCaseForDecision;
        queueType: QueueType;
        mappedDecision: AdminReviewMappedDecision;
        reviewerNotes: string;
        rejectionReasonCode: string;
        resolutionType: string;
        nowIso: string;
    },
): Promise<{ id: string }> {
    const { data: latestDecisionRun } = await admin
        .from('admission_decision_runs')
        .select('id,final_decision')
        .eq('admission_application_id', params.reviewCase.admission_application_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const { data: coldRun, error: coldRunError } = await admin
        .from('admission_decision_runs')
        .insert({
            admission_application_id: params.reviewCase.admission_application_id,
            user_id: params.reviewCase.user_id,
            decision_type: params.mappedDecision,
            ai_model_name: 'cold-path-admin',
            ai_model_version: '2026-03-07',
            policy_version: ADMISSION_POLICY_VERSION,
            input_snapshot_hash: snapshotHash({
                review_case_id: params.reviewCase.id,
                queue_type: params.queueType,
                previous_decision_run_id: latestDecisionRun?.id || null,
                previous_decision: latestDecisionRun?.final_decision || null,
                requested_decision: params.mappedDecision,
            }),
            rule_results_json: {
                queue_type: params.queueType,
                reviewer_notes: params.reviewerNotes,
                rejection_reason_code: params.rejectionReasonCode,
            },
            ai_outputs_json: {
                source: 'COLD_PATH_ADMIN',
                resolution_type: params.resolutionType || null,
                decided_at: params.nowIso,
            },
            final_decision: params.mappedDecision,
            confidence_score: 1,
            anomaly_flags_json: ['COLD_PATH_REVIEW'],
            escalation_reason_code: params.queueType,
            execution_mode: 'COLD_PATH',
        })
        .select('id')
        .single();

    if (coldRunError || !coldRun) {
        throw new RouteServiceError(
            'COLD_RUN_CREATE_FAILED',
            500,
            coldRunError?.message || 'failed to create cold run',
        );
    }

    return coldRun;
}
