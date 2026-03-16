import {
    ADMISSION_CONSENT_DEFINITIONS,
    type AdmissionConsentType,
    type AdmissionDocumentType,
    REQUIRED_DOCUMENT_TYPES,
} from './constants.ts';

export function isAdmissionDocumentType(value: string): value is AdmissionDocumentType {
    return REQUIRED_DOCUMENT_TYPES.includes(value as AdmissionDocumentType);
}

export function isAdmissionConsentType(value: string): value is AdmissionConsentType {
    return ADMISSION_CONSENT_DEFINITIONS.some((item) => item.type === value);
}

export function normalizeAckPhrase(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function expectedAckPhrase(consentType: AdmissionConsentType): string {
    const item = ADMISSION_CONSENT_DEFINITIONS.find((entry) => entry.type === consentType);
    return item?.ack_phrase || '';
}

export function isValidConsentAckPhrase(consentType: AdmissionConsentType, phrase: unknown): boolean {
    const normalized = normalizeAckPhrase(phrase);
    return normalized === expectedAckPhrase(consentType);
}
