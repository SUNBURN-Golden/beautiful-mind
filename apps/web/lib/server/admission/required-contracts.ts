import type { SupabaseClient } from '@supabase/supabase-js';

type ContractDocumentRow = {
    slug: string;
    active_version_id: string | null;
    required_for_admission: boolean;
};

type ContractAcceptanceRow = {
    document_slug: string;
    version_id: string;
};

export type ContractsReader = Pick<SupabaseClient, 'from'>;

export async function getMissingRequiredAdmissionContracts(
    userId: string,
    client: ContractsReader,
): Promise<string[]> {
    const [bundleRes, docsRes, acceptsRes] = await Promise.all([
        client
            .from('contract_bundle_requirements')
            .select('document_slug,order_index,required')
            .eq('bundle_key', 'admission-core')
            .eq('stage_code', 'CONSENTS')
            .eq('required', true)
            .order('order_index', { ascending: true }),
        client
            .from('contract_documents')
            .select('slug,active_version_id,required_for_admission')
            .eq('required_for_admission', true)
            .returns<ContractDocumentRow[]>(),
        client
            .from('contract_acceptances')
            .select('document_slug,version_id')
            .eq('user_id', userId)
            .returns<ContractAcceptanceRow[]>(),
    ]);

    if (bundleRes.error) throw new Error(bundleRes.error.message);
    if (docsRes.error) throw new Error(docsRes.error.message);
    if (acceptsRes.error) throw new Error(acceptsRes.error.message);

    const docMap = new Map((docsRes.data || []).map((doc) => [doc.slug, doc]));
    const required = (bundleRes.data || [])
        .map((row) => docMap.get(row.document_slug))
        .filter((row): row is ContractDocumentRow => Boolean(row));

    const accepted = new Set(
        (acceptsRes.data || []).map((acceptance) => `${acceptance.document_slug}:${acceptance.version_id}`),
    );

    return required
        .filter((req) => !accepted.has(`${req.slug}:${req.active_version_id}`))
        .map((req) => req.slug);
}
