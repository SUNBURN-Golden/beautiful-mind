import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeWalletLocale,
    getTxTypeLabel,
    getHoldStateLabel,
    getTxDirection,
} from '../../lib/wallet/wallet-labels.ts';

// ─── normalizeWalletLocale ───────────────────────────────────────────

describe('normalizeWalletLocale', () => {
    it('returns "en" for null', () => {
        assert.equal(normalizeWalletLocale(null), 'en');
    });
    it('returns "en" for undefined', () => {
        assert.equal(normalizeWalletLocale(undefined), 'en');
    });
    it('returns "en" for empty string', () => {
        assert.equal(normalizeWalletLocale(''), 'en');
    });
    it('returns "en" for "ja"', () => {
        assert.equal(normalizeWalletLocale('ja'), 'en');
    });
    it('returns "en" for "EN"', () => {
        assert.equal(normalizeWalletLocale('EN'), 'en');
    });
    it('returns "en" for "en"', () => {
        assert.equal(normalizeWalletLocale('en'), 'en');
    });
    it('returns "ko" for "ko"', () => {
        assert.equal(normalizeWalletLocale('ko'), 'ko');
    });
});

// ─── getTxTypeLabel — all 12 types ───────────────────────────────────

describe('getTxTypeLabel — all 12 soul_tx_type values', () => {
    const expected = {
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

    for (const [txType, labels] of Object.entries(expected)) {
        it(`maps ${txType} → EN "${labels.en}"`, () => {
            assert.equal(getTxTypeLabel(txType, 'en'), labels.en);
        });
        it(`maps ${txType} → KO "${labels.ko}"`, () => {
            assert.equal(getTxTypeLabel(txType, 'ko'), labels.ko);
        });
    }

    it('returns fallback for unknown type — en', () => {
        assert.equal(getTxTypeLabel('UNKNOWN_TYPE', 'en'), 'Wallet activity');
    });
    it('returns fallback for unknown type — ko', () => {
        assert.equal(getTxTypeLabel('UNKNOWN_TYPE', 'ko'), '월렛 활동');
    });
    it('returns fallback for null', () => {
        assert.equal(getTxTypeLabel(null, 'en'), 'Wallet activity');
    });
    it('returns fallback for undefined', () => {
        assert.equal(getTxTypeLabel(undefined, 'ko'), '월렛 활동');
    });
});

// ─── getHoldStateLabel — all 5 states ───────────────────────────────

describe('getHoldStateLabel — all 5 soul_hold_state values', () => {
    const expected = {
        PENDING: { en: 'Held', ko: '보류 중' },
        RELEASED: { en: 'Released', ko: '해제됨' },
        SLASHED: { en: 'Deducted', ko: '차감됨' },
        CANCELLED: { en: 'Cancelled', ko: '취소됨' },
        DISPUTED: { en: 'Under review', ko: '검토 중' },
    };

    for (const [state, labels] of Object.entries(expected)) {
        it(`maps ${state} → EN "${labels.en}"`, () => {
            assert.equal(getHoldStateLabel(state, 'en'), labels.en);
        });
        it(`maps ${state} → KO "${labels.ko}"`, () => {
            assert.equal(getHoldStateLabel(state, 'ko'), labels.ko);
        });
    }

    it('returns fallback for unknown state — en', () => {
        assert.equal(getHoldStateLabel('FROZEN', 'en'), 'Processing');
    });
    it('returns fallback for unknown state — ko', () => {
        assert.equal(getHoldStateLabel('FROZEN', 'ko'), '처리 중');
    });
    it('returns fallback for null', () => {
        assert.equal(getHoldStateLabel(null, 'en'), 'Processing');
    });
    it('returns fallback for undefined', () => {
        assert.equal(getHoldStateLabel(undefined, 'ko'), '처리 중');
    });
});

// ─── getTxDirection — all 12 types ──────────────────────────────────

describe('getTxDirection — all 12 soul_tx_type values', () => {
    const creditTypes = [
        'AIRDROP', 'REWARD_MINT', 'SLASHING_COMPENSATE',
        'TREASURY_GRANT', 'INSURANCE_CREDIT', 'COLLATERAL_REFUND',
    ];
    const debitTypes = [
        'GAS_FEE_BURN', 'GAS_FEE_TIP', 'SLASHING_BURN',
        'TREASURY_SPEND', 'COLLATERAL_DEPOSIT', 'COLLATERAL_SLASH',
    ];

    for (const txType of creditTypes) {
        it(`${txType} → credit`, () => {
            assert.equal(getTxDirection(txType), 'credit');
        });
    }
    for (const txType of debitTypes) {
        it(`${txType} → debit`, () => {
            assert.equal(getTxDirection(txType), 'debit');
        });
    }

    it('unknown type defaults to debit', () => {
        assert.equal(getTxDirection('UNKNOWN'), 'debit');
    });
    it('null defaults to debit', () => {
        assert.equal(getTxDirection(null), 'debit');
    });
    it('undefined defaults to debit', () => {
        assert.equal(getTxDirection(undefined), 'debit');
    });
});