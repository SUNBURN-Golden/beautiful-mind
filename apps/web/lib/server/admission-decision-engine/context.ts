import { ADMISSION_POLICY_VERSION, REQUIRED_CONSENT_TYPES } from '../admission-core.ts';
import { ADMISSION_STAGES, LEGACY_ADMISSION_STAGE_CODES } from '../../contracts/status-stages.ts';
import type { AdminClient, AdmissionApplicationRow, AdmissionDecisionContext, AdmissionDocumentRow } from './types';

export async function fetchDecisionContext(
    admin: AdminClient,
    applicationId: string,
    userId: string,
): Promise<AdmissionDecisionContext> {
    const [
        applicationResult,
        docsResult,
        identityResult,
        consentResult,
    ] = await Promise.all([
        admin
            .from('admission_applications')
            .select('id,user_id,status,current_step,policy_version,liveness_verified_at,submitted_at,ai_review_started_at')
            .eq('id', applicationId)
            .eq('user_id', userId)
            .maybeSingle<AdmissionApplicationRow>(),
        admin
            .from('admission_document_submissions')
            .select('id,document_type,upload_status,processing_status,final_result,ai_result,ai_confidence,file_storage_key_ephemeral,extracted_claims_json')
            .eq('admission_application_id', applicationId)
            .eq('user_id', userId)
            .returns<AdmissionDocumentRow[]>(),
        admin
            .from('identity_claims')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle(),
        admin
            .from('consent_events')
            .select('consent_type,policy_version')
            .eq('user_id', userId)
            .eq('policy_version', ADMISSION_POLICY_VERSION),
    ]);

    if (applicationResult.error || !applicationResult.data) {
        throw new Error(applicationResult.error?.message || 'Admission application not found');
    }

    if (docsResult.error) {
        throw new Error(docsResult.error.message);
    }

    const consentSet = new Set((consentResult.data || []).map((row) => row.consent_type));
    const missingConsents = REQUIRED_CONSENT_TYPES.filter((type) => !consentSet.has(type));

    return {
        application: applicationResult.data,
        docs: docsResult.data || [],
        hasIdentity: Boolean(identityResult.data),
        hasLiveness: Boolean(applicationResult.data.liveness_verified_at),
        missingConsents,
    };
}

export async function markApplicationAiReviewInProgress(
    admin: AdminClient,
    context: AdmissionDecisionContext,
    applicationId: string,
    nowIso: string,
): Promise<void> {
    await admin
        .from('admission_applications')
        .update({
            status: LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW,
            current_step: ADMISSION_STAGES.AI_DECISION,
            submitted_at: context.application.submitted_at || nowIso,
            ai_review_started_at: context.application.ai_review_started_at || nowIso,
        })
        .eq('id', applicationId);
}
