// Core admission primitives used by the main user journey.
// Keep optional event/audit helpers out of this boundary.

export {
    ADMISSION_CONSENT_DEFINITIONS,
    ADMISSION_POLICY_VERSION,
    REQUIRED_CONSENT_TYPES,
    REQUIRED_DOCUMENT_TYPES,
    type AdmissionConsentType,
    type AdmissionDocumentType,
} from './admission/constants.ts';

export {
    expectedAckPhrase,
    isAdmissionConsentType,
    isAdmissionDocumentType,
    isValidConsentAckPhrase,
    normalizeAckPhrase,
} from './admission/validation.ts';

export { buildAttestationHash, maskValue } from './admission/attestation.ts';
export { scanAdmissionDocument, type AdmissionScanResult } from './admission/document-scan.ts';
export {
    ensureAdmissionApplication,
    getOrCreateAdmissionApplication,
    type AdmissionApplicationRow,
} from './admission/applications.ts';
