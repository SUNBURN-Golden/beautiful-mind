import { expect, test, describe } from 'vitest';
import { calculateUserStatus, calculateTierScore } from './status';

describe('Core Logic: Onboarding Status (calculateUserStatus)', () => {
    test('returns PENDING_CONSENT if any consent is missing', () => {
        const profile = { verified: true, reputation_score: 100 };
        const consent = { osint_granted: true, location_granted: false, device_granted: true };
        const contract = { agreed_to_terms: true, signature_base64: 'abc' };

        expect(calculateUserStatus(profile, consent, contract, null)).toBe('PENDING_CONSENT');
    });

    test('returns COMPLETED when all conditions are met', () => {
        const profile = { verified: true, reputation_score: 100 };
        const consent = { osint_granted: true, location_granted: true, device_granted: true };
        const contract = { agreed_to_terms: true, signature_base64: 'abc' };
        const interview = { decision: 'APPROVED' as const, score: 90 };

        expect(calculateUserStatus(profile, consent, contract, interview)).toBe('COMPLETED');
    });

    test('returns REJECTED if interview decision is REJECTED', () => {
        const profile = { verified: true, reputation_score: 100 };
        const consent = { osint_granted: true, location_granted: true, device_granted: true };
        const contract = { agreed_to_terms: true, signature_base64: 'abc' };
        const interview = { decision: 'REJECTED' as const, score: 20 };

        expect(calculateUserStatus(profile, consent, contract, interview)).toBe('REJECTED');
    });
});

describe('Core Logic: Tier Score (calculateTierScore)', () => {
    test('adds max 20 bonus points for perfect interview', () => {
        expect(calculateTierScore(100, 100, 0)).toBe(120);
    });

    test('deducts 10 points per abuse report', () => {
        expect(calculateTierScore(100, 50, 2)).toBe(90); // 100 + 10(bonus) - 20(penalty)
    });

    test('caps upper bound at 120', () => {
        expect(calculateTierScore(120, 100, 0)).toBe(120);
    });

    test('drops score steeply for >3 reports', () => {
        expect(calculateTierScore(100, 50, 4)).toBe(50); // Math.max(0, 100 - 50)
    });
});
