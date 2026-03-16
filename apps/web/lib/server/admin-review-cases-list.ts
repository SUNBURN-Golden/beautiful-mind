import type { SupabaseClient } from '@supabase/supabase-js';
import { REQUIRED_DOCUMENT_TYPES } from './admission-core.ts';
import { RouteServiceError } from './route-service-error';
import { getReviewQueueType } from './admin-review-queue.ts';
import {
    countVerifiedRequiredDocuments,
    fetchReviewCaseListSupportData,
    resolveReviewCaseQueuePayload,
} from './admin-review-cases-list-support.ts';

type ReviewCaseRow = {
    id: string;
    admission_application_id: string;
    user_id: string;
    state: string;
    opened_at: string | null;
    decided_at: string | null;
    reviewer_notes: string | null;
    ai_summary_json: Record<string, unknown> | null;
};

export async function listAdminAdmissionReviewCases(admin: SupabaseClient) {
    const { data: reviewCases, error: reviewCaseError } = await admin
        .from('review_cases')
        .select('id,admission_application_id,user_id,state,opened_at,decided_at,decided_by,reviewer_notes,updated_at,ai_summary_json')
        .order('updated_at', { ascending: false })
        .limit(300);

    if (reviewCaseError) {
        throw new RouteServiceError('REVIEW_CASE_LIST_FAILED', 500, reviewCaseError.message);
    }

    const queueCases = ((reviewCases || []) as ReviewCaseRow[])
        .filter((row) => getReviewQueueType(row.ai_summary_json) !== 'UNKNOWN');

    if (queueCases.length === 0) {
        return { count: 0, items: [] };
    }

    const applicationIds = queueCases.map((row) => row.admission_application_id);
    const supportData = await fetchReviewCaseListSupportData(admin, applicationIds);

    const items = queueCases.map((reviewCase) => {
        const queueType = getReviewQueueType(reviewCase.ai_summary_json);
        const application = supportData.appMap.get(reviewCase.admission_application_id);
        const submissionRows = supportData.docsByApp.get(reviewCase.admission_application_id) || [];
        const verifiedCount = countVerifiedRequiredDocuments(submissionRows);
        const queuePayload = resolveReviewCaseQueuePayload(
            supportData,
            queueType,
            reviewCase.admission_application_id,
        );

        return {
            review_case_id: reviewCase.id,
            admission_application_id: reviewCase.admission_application_id,
            applicant_user_id: reviewCase.user_id,
            queue_type: queueType,
            queue_payload: queuePayload || null,
            review_state: reviewCase.state,
            opened_at: reviewCase.opened_at,
            decided_at: reviewCase.decided_at,
            reviewer_notes: reviewCase.reviewer_notes,
            admission_status: application?.status || null,
            admission_current_step: application?.current_step || null,
            rejection_reason_code: application?.rejection_reason_code || null,
            submitted_at: application?.submitted_at || null,
            approved_at: application?.approved_at || null,
            rejected_at: application?.rejected_at || null,
            documents_verified_or_ai_passed: verifiedCount,
            documents_required_total: REQUIRED_DOCUMENT_TYPES.length,
        };
    });

    return {
        count: items.length,
        items,
    };
}
