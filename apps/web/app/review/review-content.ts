export const ATTESTATION_ITEMS = [
    {
        id: 'PERSON_MATCH',
        label: 'Verified Identity Match',
        description: 'The person you met matched their admission-verified identity.',
    },
    {
        id: 'SAFETY_COMPLIANCE',
        label: 'No Critical Safety Violation',
        description: 'No coercion, impersonation, extortion, or other severe policy breach was observed.',
    },
    {
        id: 'CONSENT_RESPECT',
        label: 'Consent Boundaries Respected',
        description: 'The interaction respected mutual consent and platform policy boundaries.',
    },
    {
        id: 'IDENTITY_CONSISTENCY',
        label: 'Identity Claims Were Consistent',
        description: 'No material mismatch was observed between verified claims and real interaction.',
    },
    {
        id: 'INTEGRITY_SIGNAL',
        label: 'Positive Integrity Signal',
        description: 'The interaction contributed positively to network trust and integrity.',
    },
] as const;

export type SubmittedPayload = {
    eventId: string;
    submittedAt: string;
    selectedItems: string[];
    escalationRequested: boolean;
};
