import { buildAttestationHash, isAdmissionDocumentType } from '../admission-core.ts';
import type { AdminClient, AdmissionDocumentRow } from './types';

type ClaimCandidate = {
    claim_type: string;
    claim_value_normalized: Record<string, unknown>;
    source_document_type: string;
};

export function mapClaimType(documentType: string): string {
    switch (documentType) {
        case 'GRADUATION_CERTIFICATE':
            return 'GRADUATION_VERIFIED';
        case 'INCOME_CERTIFICATE':
            return 'INCOME_BAND_VERIFIED';
        case 'MARRIAGE_CERTIFICATE':
            return 'MARITAL_STATUS_VERIFIED';
        case 'FAMILY_RELATION_CERTIFICATE':
            return 'HAS_CHILDREN_VERIFIED';
        default:
            return 'DOCUMENT_VERIFIED';
    }
}

export function normalizeClaimValue(
    documentType: string,
    extractedClaims: Record<string, unknown> | null,
): Record<string, unknown> {
    const src = extractedClaims || {};

    if (documentType === 'GRADUATION_CERTIFICATE') {
        return {
            graduate_verified: src.graduate_verified === true,
            school_name_masked: typeof src.school_name_masked === 'string' ? src.school_name_masked : null,
        };
    }

    if (documentType === 'INCOME_CERTIFICATE') {
        return {
            income_year: typeof src.income_year === 'number' ? src.income_year : null,
            income_band: typeof src.income_band === 'string' ? src.income_band : 'UNCONFIRMED',
            income_verified: src.income_verified === true,
        };
    }

    if (documentType === 'MARRIAGE_CERTIFICATE') {
        return {
            marital_status: typeof src.marital_status === 'string' ? src.marital_status : 'UNCONFIRMED',
            divorced_flag: src.divorced_flag === true,
            marriage_verified: src.marriage_verified === true,
        };
    }

    return {
        has_children: src.has_children === true,
        children_count_band: typeof src.children_count_band === 'string' ? src.children_count_band : 'UNCONFIRMED',
        family_relation_verified: src.family_relation_verified === true,
    };
}

export function buildClaimCandidates(docs: AdmissionDocumentRow[]): ClaimCandidate[] {
    return docs
        .filter((doc) => isAdmissionDocumentType(doc.document_type))
        .map((doc) => ({
            claim_type: mapClaimType(doc.document_type),
            claim_value_normalized: normalizeClaimValue(doc.document_type, doc.extracted_claims_json),
            source_document_type: doc.document_type,
        }));
}

export function buildVerifiedClaimInserts(params: {
    userId: string;
    candidates: ClaimCandidate[];
    existingClaimTypes: string[];
    verificationMethod: string;
    nowIso: string;
    policyVersion: string;
}): Array<Record<string, unknown>> {
    const existingSet = new Set(params.existingClaimTypes);
    return params.candidates
        .filter((row) => !existingSet.has(row.claim_type))
        .map((row) => ({
            user_id: params.userId,
            claim_type: row.claim_type,
            claim_value_normalized: row.claim_value_normalized,
            source_document_type: row.source_document_type,
            verification_method: params.verificationMethod,
            verification_status: 'VERIFIED',
            verified_at: params.nowIso,
            policy_version: params.policyVersion,
            attestation_hash: buildAttestationHash(params.userId, row.claim_type, row.claim_value_normalized),
        }));
}

export async function upsertVerifiedClaims(
    admin: AdminClient,
    userId: string,
    docs: AdmissionDocumentRow[],
    verificationMethod: string,
    nowIso: string,
    policyVersion: string,
): Promise<void> {
    const candidates = buildClaimCandidates(docs);
    const claimTypes = candidates.map((row) => row.claim_type);
    if (claimTypes.length === 0) return;

    const { data: existingClaims } = await admin
        .from('verified_claims')
        .select('claim_type')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .in('claim_type', claimTypes);

    const inserts = buildVerifiedClaimInserts({
        userId,
        candidates,
        existingClaimTypes: (existingClaims || []).map((row) => row.claim_type),
        verificationMethod,
        nowIso,
        policyVersion,
    });

    if (inserts.length === 0) return;

    const { error } = await admin.from('verified_claims').insert(inserts);
    if (error) {
        throw new Error(`Verified claim insert failed: ${error.message}`);
    }
}
