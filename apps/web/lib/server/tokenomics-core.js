/**
 * Core tokenomics helpers shared by API handlers and unit tests.
 */

/**
 * @param {number} claimNo
 * @returns {{ cohort: 'TOP100' | 'TOP1000' | 'BASE', amount: number }}
 */
export function resolveAirdropTier(claimNo) {
    if (!Number.isFinite(claimNo) || claimNo <= 0) {
        return { cohort: 'BASE', amount: 20 };
    }
    if (claimNo <= 100) {
        return { cohort: 'TOP100', amount: 80 };
    }
    if (claimNo <= 1000) {
        return { cohort: 'TOP1000', amount: 50 };
    }
    return { cohort: 'BASE', amount: 20 };
}

/**
 * @param {string | null | undefined} status
 * @returns {number}
 */
export function mapTreasurySpendStatusToHttp(status) {
    switch (status) {
        case 'SPENT':
        case 'IDEMPOTENT_SKIPPED':
            return 200;
        case 'BUDGET_NOT_FOUND':
        case 'BUDGET_EXCEEDED':
            return 409;
        case 'BAD_REQUEST':
            return 400;
        default:
            return 400;
    }
}

