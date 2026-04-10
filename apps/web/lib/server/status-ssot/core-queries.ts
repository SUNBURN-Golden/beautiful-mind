import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AdmissionApplication,
    ConsentEvent,
    ContractAcceptance,
    StatusCoreInputs,
    SoulCredential,
    VerifiedClaimRow,
} from './types.ts';

export async function fetchCoreStatusInputs(
    admin: SupabaseClient,
    userId: string,
) {
    const [
        profileResult,
        identityResult,
        applicationResult,
        documentResult,
        consentResult,
        contractResult,
        soulCredentialResult,
        verifiedClaimsResult,
    ] = await Promise.all([
        admin
            .from('profiles')
            .select('banned,is_frozen,freeze_reason')
            .eq('id', userId)
            .maybeSingle(),
        admin
            .from('identity_claims')
            .select('verified_at')
            .eq('user_id', userId)
            .maybeSingle(),
        admin
            .from('admission_applications')
            .select('id,status,current_step,policy_version,submitted_at,ai_review_started_at,ai_review_completed_at,human_review_started_at,human_review_completed_at,approved_at,rejected_at,rejection_reason_code,liveness_verified_at,soul_issued_at,activated_at')
            .eq('user_id', userId)
            .maybeSingle<AdmissionApplication>(),
        admin
            .from('admission_document_submissions')
            .select('document_type,upload_status,processing_status,final_result,ai_confidence,uploaded_at,processed_at,purged_at')
            .eq('user_id', userId),
        admin
            .from('consent_events')
            .select('consent_type,granted_at,policy_version')
            .eq('user_id', userId)
            .order('granted_at', { ascending: false })
            .returns<ConsentEvent[]>(),
        admin
            .from('contract_acceptances')
            .select('document_slug,version_id,accepted_at')
            .eq('user_id', userId)
            .returns<ContractAcceptance[]>(),
        admin
            .from('soul_credentials')
            .select('id,status,issued_at')
            .eq('user_id', userId)
            .eq('status', 'ISSUED')
            .maybeSingle<SoulCredential>(),
        admin
            .from('verified_claims')
            .select('claim_type,verification_status')
            .eq('user_id', userId)
            .returns<VerifiedClaimRow[]>(),
    ]);

    const inputs: StatusCoreInputs = {
        profile: profileResult.data ?? null,
        identity: identityResult.data ?? null,
        application: applicationResult.data ?? null,
        documents: documentResult.data ?? [],
        consentEvents: consentResult.data ?? [],
        contractAcceptances: contractResult.data ?? [],
        soulCredential: soulCredentialResult.data ?? null,
        verifiedClaims: verifiedClaimsResult.data ?? [],
    };

    return {
        profileError: profileResult.error ? { message: profileResult.error.message } : null,
        inputs,
    };
}
