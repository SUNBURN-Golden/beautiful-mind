import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { getMissingRequiredAdmissionContracts, type ContractsReader } from './admission/required-contracts.ts';
import { findLatestApplicationId } from './active-features/shared.ts';
import { getServiceRoleClient, getSessionUser } from './trust';

export type ContractVersionDetails = {
    id: string;
    document_slug: string;
    version_hash: string;
    summary_markdown: string;
    full_text_markdown: string;
    req_typed_phrase: string | null;
    display_title: string;
};

export async function getMissingContracts(
    userId: string,
    client?: ContractsReader,
): Promise<string[]> {
    const supabase = client ?? await createClient();
    return getMissingRequiredAdmissionContracts(userId, supabase);
}

export async function getContractDetails(slug: string): Promise<ContractVersionDetails | null> {
    const supabase = await createClient();
    
    const docRes = await supabase
        .from('contract_documents')
        .select('slug, display_title, active_version_id')
        .eq('slug', slug)
        .maybeSingle();

    if (!docRes.data || !docRes.data.active_version_id) return null;

    const versionRes = await supabase
        .from('contract_document_versions')
        .select('id, document_slug, version_hash, summary_markdown, full_text_markdown, req_typed_phrase')
        .eq('id', docRes.data.active_version_id)
        .maybeSingle();

    if (!versionRes.data) return null;

    return {
        ...versionRes.data,
        display_title: docRes.data.display_title,
    };
}

export async function signContract(params: {
    userId: string;
    documentSlug: string;
    versionId: string;
    typedPhrase?: string;
    deviceFingerprint?: string;
    secondaryConfirmed?: boolean;
}, deps?: {
    getSessionUser?: typeof getSessionUser;
    getServiceRoleClient?: () => SupabaseClient;
    findLatestApplicationId?: typeof findLatestApplicationId;
}) {
    const getSessionUserImpl = deps?.getSessionUser ?? getSessionUser;
    const getServiceRoleClientImpl = deps?.getServiceRoleClient ?? getServiceRoleClient;
    const findLatestApplicationIdImpl = deps?.findLatestApplicationId ?? findLatestApplicationId;

    const actor = await getSessionUserImpl();
    if (!actor || actor.id !== params.userId) {
        throw new Error('Unauthorized');
    }

    const admin = getServiceRoleClientImpl();
    const applicationId = await findLatestApplicationIdImpl(admin, params.userId);

    // 1) Insert acceptance
    const acceptRes = await admin
        .from('contract_acceptances')
        .insert({
            user_id: params.userId,
            document_slug: params.documentSlug,
            version_id: params.versionId,
            admission_application_id: applicationId,
            accepted_via: 'APPLY_CONTRACT_STACK',
            secondary_confirmed_at: params.secondaryConfirmed ? new Date().toISOString() : null,
        })
        .select('id')
        .maybeSingle();

    if (acceptRes.error) {
        if (acceptRes.error.code === '23505') {
            return { success: true, alreadySigned: true };
        }
        throw new Error(`Failed to sign contract: ${acceptRes.error.message}`);
    }

    // 2) Insert evidence if typed phrase exists
    if (params.typedPhrase) {
        const evRes = await admin
            .from('typed_acknowledgement_evidence')
            .insert({
                acceptance_id: acceptRes.data!.id,
                typed_phrase: params.typedPhrase,
                device_fingerprint: params.deviceFingerprint || 'unknown-device',
                ack_category: params.documentSlug === 'fraud-penalty'
                    ? 'FRAUD_PENALTY_COVENANT'
                    : params.documentSlug === 'intelligence-monitoring'
                        ? 'INTELLIGENCE_MONITORING'
                        : 'GENERIC',
            });
            
        if (evRes.error) {
            throw new Error(`Failed to store acknowledgement evidence: ${evRes.error.message}`);
        }
    }

    const eventRes = await admin
        .from('contract_acceptance_events')
        .insert({
            acceptance_id: acceptRes.data!.id,
            user_id: params.userId,
            application_id: applicationId,
            event_type: 'ACCEPTED',
            event_payload: {
                document_slug: params.documentSlug,
                version_id: params.versionId,
                secondary_confirmed: params.secondaryConfirmed === true,
            },
        });

    if (eventRes.error) {
        throw new Error(`Failed to store contract acceptance event: ${eventRes.error.message}`);
    }

    return { success: true };
}
