export type WalletLocale = 'en' | 'ko';
export type WalletDirection = 'credit' | 'debit';

// ————————————————————————————————————————————————
// soul_tx_type → human label
// Per WALLET_SURFACE_CONTRACT.md Section 5
// ————————————————————————————————————————————————

const TX_TYPE_LABELS: Record<string, Record<WalletLocale, string>> = {
    AIRDROP: { en: 'SOUL grant', ko: 'SOUL 지급' },
    GAS_FEE_BURN: { en: 'Processing fee', ko: '처리 수수료' },
    GAS_FEE_TIP: { en: 'Service fee', ko: '서비스 수수료' },
    REWARD_MINT: { en: 'Reward', ko: '보상' },
    SLASHING_BURN: { en: 'Deduction', ko: '차감' },
    SLASHING_COMPENSATE: { en: 'Trust compensation', ko: '신뢰 보상' },
    TREASURY_GRANT: { en: 'Grant', ko: '지원금' },
    TREASURY_SPEND: { en: 'Used', ko: '사용' },
    INSURANCE_CREDIT: { en: 'Insurance credit', ko: '보험 보상' },
    COLLATERAL_DEPOSIT: { en: 'Deposit', ko: '예치' },
    COLLATERAL_REFUND: { en: 'Refund', ko: '환급' },
    COLLATERAL_SLASH: { en: 'Penalty deduction', ko: '벌금 차감' },
};

const TX_TYPE_FALLBACK: Record<WalletLocale, string> = {
    en: 'Wallet activity',
    ko: '월렛 활동',
};

const CREDIT_TYPES = new Set([
    'AIRDROP',
    'REWARD_MINT',
    'SLASHING_COMPENSATE',
    'TREASURY_GRANT',
    'INSURANCE_CREDIT',
    'COLLATERAL_REFUND',
]);

// ————————————————————————————————————————————————
// soul_hold_state → human label
// Per WALLET_SURFACE_CONTRACT.md Section 6
// ————————————————————————————————————————————————

const HOLD_STATE_LABELS: Record<string, Record<WalletLocale, string>> = {
    PENDING: { en: 'Held', ko: '보류 중' },
    RELEASED: { en: 'Released', ko: '해제됨' },
    SLASHED: { en: 'Deducted', ko: '차감됨' },
    CANCELLED: { en: 'Cancelled', ko: '취소됨' },
    DISPUTED: { en: 'Under review', ko: '검토 중' },
};

const HOLD_STATE_FALLBACK: Record<WalletLocale, string> = {
    en: 'Processing',
    ko: '처리 중',
};

// ————————————————————————————————————————————————
// Exported functions
// ————————————————————————————————————————————————

export function normalizeWalletLocale(locale: string | null | undefined): WalletLocale {
    if (locale === 'ko') return 'ko';
    return 'en';
}

export function getTxTypeLabel(rawType: string | null | undefined, locale: WalletLocale): string {
    if (!rawType) return TX_TYPE_FALLBACK[locale];
    return TX_TYPE_LABELS[rawType]?.[locale] ?? TX_TYPE_FALLBACK[locale];
}

export function getHoldStateLabel(rawState: string | null | undefined, locale: WalletLocale): string {
    if (!rawState) return HOLD_STATE_FALLBACK[locale];
    return HOLD_STATE_LABELS[rawState]?.[locale] ?? HOLD_STATE_FALLBACK[locale];
}

export function getTxDirection(rawType: string | null | undefined): WalletDirection {
    if (!rawType) return 'debit';
    return CREDIT_TYPES.has(rawType) ? 'credit' : 'debit';
}
