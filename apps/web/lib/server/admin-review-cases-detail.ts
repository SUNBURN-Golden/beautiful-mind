import type { SupabaseClient } from '@supabase/supabase-js';
import { RouteServiceError } from './route-service-error.ts';
import { getReviewQueueLinkedIds } from './admin-review-queue.ts';

type ContractBundleRequirementRow = {
    document_slug: string;
    order_index: number;
    required: boolean;
};

type ContractDocumentRow = {
    slug: string;
    display_title: string;
    active_version_id: string | null;
};

type ContractAcceptanceRow = {
    id: string;
    document_slug: string;
    version_id: string;
    accepted_at: string;
    accepted_via: string | null;
    secondary_confirmed_at: string | null;
    admission_application_id: string | null;
};

type TypedAcknowledgementEvidenceRow = {
    acceptance_id: string;
    typed_phrase: string;
    ack_category: string;
    timestamp: string;
};

type ContractAcceptanceEventRow = {
    acceptance_id: string;
    event_type: string;
    event_payload: Record<string, unknown>;
    created_at: string;
};

function buildContractSignatureDetail(params: {
    bundleRequirements: ContractBundleRequirementRow[];
    contractDocuments: ContractDocumentRow[];
    contractAcceptances: ContractAcceptanceRow[];
    acknowledgementEvidence: TypedAcknowledgementEvidenceRow[];
    acceptanceEvents: ContractAcceptanceEventRow[];
}) {
    const docMap = new Map(params.contractDocuments.map((doc) => [doc.slug, doc]));
    const acceptanceBySlug = new Map(params.contractAcceptances.map((acceptance) => [acceptance.document_slug, acceptance]));

    const evidenceByAcceptanceId = new Map<string, TypedAcknowledgementEvidenceRow>();
    for (const evidence of params.acknowledgementEvidence) {
        const current = evidenceByAcceptanceId.get(evidence.acceptance_id);
        if (!current || current.timestamp < evidence.timestamp) {
            evidenceByAcceptanceId.set(evidence.acceptance_id, evidence);
        }
    }

    const latestEventByAcceptanceId = new Map<string, ContractAcceptanceEventRow>();
    for (const event of params.acceptanceEvents) {
        const current = latestEventByAcceptanceId.get(event.acceptance_id);
        if (!current || current.created_at < event.created_at) {
            latestEventByAcceptanceId.set(event.acceptance_id, event);
        }
    }

    return params.bundleRequirements
        .slice()
        .sort((left, right) => left.order_index - right.order_index)
        .map((requirement) => {
            const document = docMap.get(requirement.document_slug);
            const acceptance = acceptanceBySlug.get(requirement.document_slug) || null;
            const evidence = acceptance ? evidenceByAcceptanceId.get(acceptance.id) || null : null;
            const latestEvent = acceptance ? latestEventByAcceptanceId.get(acceptance.id) || null : null;

            return {
                document_slug: requirement.document_slug,
                display_title: document?.display_title || requirement.document_slug,
                required: requirement.required,
                active_version_id: document?.active_version_id || null,
                acceptance_id: acceptance?.id || null,
                signed: Boolean(acceptance),
                signed_current_version: Boolean(
                    acceptance
                    && document?.active_version_id
                    && acceptance.version_id === document.active_version_id,
                ),
                accepted_at: acceptance?.accepted_at || null,
                accepted_via: acceptance?.accepted_via || null,
                secondary_confirmed_at: acceptance?.secondary_confirmed_at || null,
                typed_ack_phrase: evidence?.typed_phrase || null,
                ack_category: evidence?.ack_category || null,
                acknowledgement_captured_at: evidence?.timestamp || null,
                latest_event_type: latestEvent?.event_type || null,
                latest_event_at: latestEvent?.created_at || null,
                latest_event_payload: latestEvent?.event_payload || null,
            };
        });
}

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
        contractBundleResult,
        contractDocsResult,
        contractAcceptancesResult,
        contractEventsResult,
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
            .from('contract_bundle_requirements')
            .select('document_slug,order_index,required')
            .eq('bundle_key', 'admission-core')
            .eq('stage_code', 'CONSENTS')
            .eq('required', true)
            .order('order_index', { ascending: true })
            .returns<ContractBundleRequirementRow[]>(),
        admin
            .from('contract_documents')
            .select('slug,display_title,active_version_id')
            .returns<ContractDocumentRow[]>(),
        admin
            .from('contract_acceptances')
            .select('id,document_slug,version_id,accepted_at,accepted_via,secondary_confirmed_at,admission_application_id')
            .eq('user_id', reviewCase.user_id)
            .order('accepted_at', { ascending: true })
            .returns<ContractAcceptanceRow[]>(),
        admin
            .from('contract_acceptance_events')
            .select('acceptance_id,event_type,event_payload,created_at')
            .eq('user_id', reviewCase.user_id)
            .order('created_at', { ascending: true })
            .returns<ContractAcceptanceEventRow[]>(),
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

    const contractAcceptanceIds = (contractAcceptancesResult.data || []).map((row) => row.id);
    const contractEvidenceResult = contractAcceptanceIds.length > 0
        ? await admin
            .from('typed_acknowledgement_evidence')
            .select('acceptance_id,typed_phrase,ack_category,timestamp')
            .in('acceptance_id', contractAcceptanceIds)
            .order('timestamp', { ascending: true })
            .returns<TypedAcknowledgementEvidenceRow[]>()
        : { data: [], error: null };

    const contractSignatures = buildContractSignatureDetail({
        bundleRequirements: contractBundleResult.data || [],
        contractDocuments: contractDocsResult.data || [],
        contractAcceptances: contractAcceptancesResult.data || [],
        acknowledgementEvidence: contractEvidenceResult.data || [],
        acceptanceEvents: contractEventsResult.data || [],
    });

    return {
        review_case: reviewCase,
        admission_application: applicationResult.data || null,
        documents: docsResult.data || [],
        consents: consentResult.data || [],
        contract_signatures: contractSignatures,
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
