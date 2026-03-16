import { REQUIRED_DOCUMENT_TYPES } from '../admission-core.ts';
import type { AdminClient, AdmissionDocumentRow } from './types';

export function listMissingRequiredDocumentTypes(docs: AdmissionDocumentRow[]): string[] {
    const docTypeSet = new Set(docs.map((doc) => doc.document_type));
    return REQUIRED_DOCUMENT_TYPES.filter((type) => !docTypeSet.has(type));
}

export async function fetchAdmissionDocuments(
    admin: AdminClient,
    params: { applicationId: string; userId: string },
): Promise<AdmissionDocumentRow[]> {
    const { data: docsData, error: docsError } = await admin
        .from('admission_document_submissions')
        .select('id,document_type,upload_status,processing_status,final_result,ai_result,ai_confidence,file_storage_key_ephemeral,extracted_claims_json')
        .eq('admission_application_id', params.applicationId)
        .eq('user_id', params.userId)
        .returns<AdmissionDocumentRow[]>();

    if (docsError) {
        throw new Error(`Document lookup failed: ${docsError.message}`);
    }

    return docsData || [];
}
