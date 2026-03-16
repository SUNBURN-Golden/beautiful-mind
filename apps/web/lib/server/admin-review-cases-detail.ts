import type { SupabaseClient } from '@supabase/supabase-js';
import { RouteServiceError } from './route-service-error';
import { getReviewQueueLinkedIds } from './admin-review-queue.ts';

export async function getAdminAdmissionReviewCaseDetail(
    admin: SupabaseClient,
    reviewCaseId: string,
) {
    const { data: reviewCase, error: reviewCaseError } = await admin
        .from('review_cases')
        .select('id,admission_application_id,user_id,state,opened_at,decided_at,decided_by,reviewer_notes,ai_summary_json,created_at,updated_at')
        .eq('id', reviewCaseId)
        .maybeSingle();

    if (reviewCaseError) {
        throw new RouteServiceError('REVIEW_CASE_LOOKUP_FAILED', 500, reviewCaseError.message);
    }

    if (!reviewCase) {
        throw new RouteServiceError('NOT_FOUND', 404, 'review case not found');
    }

    const linkedIds = getReviewQueueLinkedIds(reviewCase.ai_summary_json);
    const [
        applicationResult,
        docsResult,
        consentResult,
        caseEventsResult,
        trustLedgerResult,
        claimsResult,
        soulResult,
        decisionRunsResult,
        appealResult,
        exceptionResult,
        auditResult,
    ] = await Promise.all([
        admin
            .from('admission_applications')
            .select('*')
            .eq('id', reviewCase.admission_application_id)
            .maybeSingle(),
        admin
            .from('admission_document_submissions')
            .select('id,document_type,upload_status,processing_status,ai_result,ai_confidence,human_result,final_result,extracted_claims_json,uploaded_at,processed_at,purged_at')
            .eq('admission_application_id', reviewCase.admission_application_id)
            .order('created_at', { ascending: true }),
        admin
            .from('consent_events')
            .select('consent_type,policy_version,granted_at,typed_ack_phrase,capture_method,audit_reference')
            .eq('user_id', reviewCase.user_id)
            .order('granted_at', { ascending: true }),
        admin
            .from('review_case_events')
            .select('id,actor_user_id,actor_role,event_type,payload,created_at')
            .eq('review_case_id', reviewCase.id)
            .order('created_at', { ascending: true }),
        admin
            .from('trust_ledger_events')
            .select('id,event_type,event_payload,previous_event_hash,event_hash,created_at')
            .eq('admission_application_id', reviewCase.admission_application_id)
            .order('created_at', { ascending: true }),
        admin
            .from('verified_claims')
            .select('id,claim_type,claim_value_normalized,verification_status,verified_at,revoked_at,policy_version')
            .eq('user_id', reviewCase.user_id)
            .order('verified_at', { ascending: false }),
        admin
            .from('soul_credentials')
            .select('id,status,issued_at,revoked_at,trust_level,metadata')
            .eq('user_id', reviewCase.user_id)
            .order('issued_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        admin
            .from('admission_decision_runs')
            .select('id,decision_type,final_decision,confidence_score,policy_version,execution_mode,rule_results_json,ai_outputs_json,anomaly_flags_json,escalation_reason_code,created_at')
            .eq('admission_application_id', reviewCase.admission_application_id)
            .order('created_at', { ascending: false })
            .limit(20),
        linkedIds.appealId
            ? admin.from('appeals').select('*').eq('id', linkedIds.appealId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        linkedIds.exceptionCaseId
            ? admin.from('exception_cases').select('*').eq('id', linkedIds.exceptionCaseId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        linkedIds.sampleId
            ? admin.from('audit_samples').select('*').eq('id', linkedIds.sampleId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    return {
        review_case: reviewCase,
        admission_application: applicationResult.data || null,
        documents: docsResult.data || [],
        consents: consentResult.data || [],
        review_case_events: caseEventsResult.data || [],
        trust_ledger_timeline: trustLedgerResult.data || [],
        verified_claims: claimsResult.data || [],
        soul_credential: soulResult.data || null,
        decision_runs: decisionRunsResult.data || [],
        appeal: appealResult.data || null,
        exception_case: exceptionResult.data || null,
        audit_sample: auditResult.data || null,
    };
}
