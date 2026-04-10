import {
    ADMISSION_POLICY_VERSION,
    REQUIRED_CONSENT_TYPES,
    REQUIRED_DOCUMENT_TYPES,
    isAdmissionDocumentType,
} from '../admission-core.ts';
import type { AdmissionDocument, ConsentEvent, ConsentProgress, ContractAcceptance, ContractProgress, DocumentProgress } from './types.ts';

export function requiredDocumentProgress(documents: AdmissionDocument[]): DocumentProgress {
    const byType = new Map<string, AdmissionDocument>();
    for (const row of documents) {
        if (!isAdmissionDocumentType(row.document_type)) continue;
        byType.set(row.document_type, row);
    }

    const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => {
        const doc = byType.get(type);
        return !doc || doc.final_result !== 'VERIFIED';
    });

    return {
        missing,
        verifiedCount: REQUIRED_DOCUMENT_TYPES.length - missing.length,
        totalRequired: REQUIRED_DOCUMENT_TYPES.length,
        byType,
    };
}

export function buildConsentProgress(
    consentEvents: ConsentEvent[],
    policyVersion = ADMISSION_POLICY_VERSION,
): ConsentProgress {
    const consentSet = new Set(
        consentEvents
            .filter((event) => (event.policy_version || ADMISSION_POLICY_VERSION) === policyVersion)
            .map((event) => event.consent_type),
    );
    const missingConsents = REQUIRED_CONSENT_TYPES.filter((consent) => !consentSet.has(consent));
    return {
        consentSet,
        missingConsents,
        consentCompleted: missingConsents.length === 0,
    };
}

export function buildContractProgress(
    contractAcceptances: ContractAcceptance[],
): ContractProgress {
    const acceptedSet = new Set(contractAcceptances.map((a) => a.document_slug));
    const missingContracts: string[] = [];
    return {
        acceptedSet,
        missingContracts,
        contractsCompleted: acceptedSet.size > 0,
    };
}
