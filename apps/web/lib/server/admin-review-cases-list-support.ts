import type { SupabaseClient } from '@supabase/supabase-js';
import { REQUIRED_DOCUMENT_TYPES } from './admission-core.ts';
import type { QueueType } from './admin-review-queue.ts';

type QueueAttachmentRow = Record<string, unknown> & {
    admission_application_id: string;
    created_at: string | null;
};

type ReviewCaseApplicationRow = {
    id: string;
    status: string;
    current_step: string;
    submitted_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_reason_code: string | null;
};

type ReviewCaseDocumentRow = {
    admission_application_id: string;
    document_type: string;
    final_result: string;
    processing_status: string;
    purged_at: string | null;
};

type ReviewCaseListSupportData = {
    appMap: Map<string, ReviewCaseApplicationRow>;
    docsByApp: Map<string, ReviewCaseDocumentRow[]>;
    latestAppealByApp: Map<string, QueueAttachmentRow>;
    latestExceptionByApp: Map<string, QueueAttachmentRow>;
    latestAuditByApp: Map<string, QueueAttachmentRow>;
};

function selectLatestByApplication<T extends QueueAttachmentRow>(rows: T[] | null | undefined): Map<string, T> {
    const latestByApp = new Map<string, T>();
    for (const row of rows || []) {
        const current = latestByApp.get(row.admission_application_id);
        if (!current || String(current.created_at) < String(row.created_at)) {
            latestByApp.set(row.admission_application_id, row);
        }
    }
    return latestByApp;
}

function groupDocumentsByApplication(rows: ReviewCaseDocumentRow[] | null | undefined) {
    const docsByApp = new Map<string, ReviewCaseDocumentRow[]>();
    for (const row of rows || []) {
        const current = docsByApp.get(row.admission_application_id) || [];
        current.push(row);
        docsByApp.set(row.admission_application_id, current);
    }
    return docsByApp;
}

export async function fetchReviewCaseListSupportData(
    admin: SupabaseClient,
    applicationIds: string[],
): Promise<ReviewCaseListSupportData> {
    const [{ data: applications }, { data: docs }, { data: appeals }, { data: exceptions }, { data: audits }] = await Promise.all([
        admin
            .from('admission_applications')
            .select('id,status,current_step,submitted_at,approved_at,rejected_at,rejection_reason_code,updated_at')
            .in('id', applicationIds),
        admin
            .from('admission_document_submissions')
            .select('admission_application_id,document_type,final_result,processing_status,purged_at')
            .in('admission_application_id', applicationIds),
        admin
            .from('appeals')
            .select('id,admission_application_id,status,created_at,resolved_at,resolution_type')
            .in('admission_application_id', applicationIds),
        admin
            .from('exception_cases')
            .select('id,admission_application_id,status,reason_code,created_at,resolved_at')
            .in('admission_application_id', applicationIds),
        admin
            .from('audit_samples')
            .select('id,admission_application_id,status,sample_reason,created_at,reviewed_at,outcome')
            .in('admission_application_id', applicationIds),
    ]);

    return {
        appMap: new Map(((applications || []) as ReviewCaseApplicationRow[]).map((row) => [row.id, row])),
        docsByApp: groupDocumentsByApplication((docs || []) as ReviewCaseDocumentRow[]),
        latestAppealByApp: selectLatestByApplication((appeals || []) as QueueAttachmentRow[]),
        latestExceptionByApp: selectLatestByApplication((exceptions || []) as QueueAttachmentRow[]),
        latestAuditByApp: selectLatestByApplication((audits || []) as QueueAttachmentRow[]),
    };
}

export function countVerifiedRequiredDocuments(submissionRows: ReviewCaseDocumentRow[]) {
    return REQUIRED_DOCUMENT_TYPES.filter((type) => {
        const hit = submissionRows.find((row) => row.document_type === type);
        return hit?.final_result === 'VERIFIED' || hit?.processing_status === 'AI_PASSED';
    }).length;
}

export function resolveReviewCaseQueuePayload(
    supportData: ReviewCaseListSupportData,
    queueType: QueueType,
    applicationId: string,
) {
    if (queueType === 'APPEAL') {
        return supportData.latestAppealByApp.get(applicationId) || null;
    }
    if (queueType === 'EXCEPTION') {
        return supportData.latestExceptionByApp.get(applicationId) || null;
    }
    return supportData.latestAuditByApp.get(applicationId) || null;
}
