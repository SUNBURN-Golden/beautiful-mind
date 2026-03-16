import { ADMISSION_POLICY_VERSION } from '../../admission-policy.ts';

export { ADMISSION_POLICY_VERSION };

export const ADMISSION_CONSENT_DEFINITIONS = [
    {
        type: 'IDENTITY_HANDLING',
        ack_phrase: 'I ACKNOWLEDGE IDENTITY HANDLING',
    },
    {
        type: 'LIVENESS_HANDLING',
        ack_phrase: 'I ACKNOWLEDGE LIVENESS HANDLING',
    },
    {
        type: 'EDUCATION_DOCUMENT_HANDLING',
        ack_phrase: 'I ACKNOWLEDGE EDUCATION DOCUMENT HANDLING',
    },
    {
        type: 'INCOME_DOCUMENT_HANDLING',
        ack_phrase: 'I ACKNOWLEDGE INCOME DOCUMENT HANDLING',
    },
    {
        type: 'MARITAL_FAMILY_DOCUMENT_HANDLING',
        ack_phrase: 'I ACKNOWLEDGE MARITAL FAMILY DOCUMENT HANDLING',
    },
    {
        type: 'AI_ASSISTED_ANALYSIS',
        ack_phrase: 'I ACKNOWLEDGE AI ASSISTED ANALYSIS',
    },
    {
        type: 'HUMAN_EXCEPTION_AUDIT_APPEAL_REVIEW',
        ack_phrase: 'I ACKNOWLEDGE HUMAN EXCEPTION AUDIT APPEAL REVIEW',
    },
    {
        type: 'IMMEDIATE_PURGE_AND_MINIMAL_RETENTION',
        ack_phrase: 'I ACKNOWLEDGE IMMEDIATE PURGE AND MINIMAL RETENTION',
    },
] as const;

export const REQUIRED_CONSENT_TYPES = ADMISSION_CONSENT_DEFINITIONS.map((item) => item.type);
export type AdmissionConsentType = (typeof ADMISSION_CONSENT_DEFINITIONS)[number]['type'];

export const REQUIRED_DOCUMENT_TYPES = [
    'GRADUATION_CERTIFICATE',
    'INCOME_CERTIFICATE',
    'MARRIAGE_CERTIFICATE',
    'FAMILY_RELATION_CERTIFICATE',
] as const;

export type AdmissionDocumentType = (typeof REQUIRED_DOCUMENT_TYPES)[number];
