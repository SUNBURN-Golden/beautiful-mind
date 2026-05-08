import type { AppLocale } from './config';

type WalletCopy = {
    title: string;
    eyebrow: string;
    description: string;
    balanceTitle: string;
    balanceDescription: string;
    availableLabel: string;
    heldLabel: string;
    totalLabel: string;
    currency: string;
    activityTitle: string;
    activityEmpty: string;
    holdsTitle: string;
    holdsEmpty: string;
    loading: string;
    error: string;
    creditPrefix: string;
    debitPrefix: string;
    emptyTitle: string;
    emptyBody: string;
    claimWelcomeLabel: string;
    claimingWelcomeLabel: string;
    claimWelcomeError: string;
};

const WALLET_COPY: Record<AppLocale, WalletCopy> = {
    en: {
        title: 'Wallet',
        eyebrow: 'Trust becomes SOUL here.',
        description: 'SOUL is earned through verified trust and used inside your SoulBound space.',
        balanceTitle: 'Your SOUL balance',
        balanceDescription: 'This is the trust asset currently available to your account.',
        availableLabel: 'Ready to use',
        heldLabel: 'Temporarily held',
        totalLabel: 'Total SOUL',
        currency: 'SOUL',
        activityTitle: 'SOUL movement',
        activityEmpty: 'No SOUL movement yet',
        holdsTitle: 'Trust holds',
        holdsEmpty: 'No active holds',
        loading: 'Opening your wallet',
        error: 'We couldn\'t open your SOUL wallet.',
        creditPrefix: '+',
        debitPrefix: '\u2212',
        emptyTitle: 'Your first SOUL is ready',
        emptyBody: 'Trust becomes SOUL here. Claim welcome SOUL to start your verified trust balance.',
        claimWelcomeLabel: 'Claim welcome SOUL',
        claimingWelcomeLabel: 'Claiming welcome SOUL',
        claimWelcomeError: 'We could not claim welcome SOUL. Please try again.',
    },
    ko: {
        title: '\uC6D4\uB81B',
        eyebrow: '\uC2E0\uB8B0\uAC00 \uC774\uACF3\uC5D0\uC11C SOUL\uC774 \uB429\uB2C8\uB2E4.',
        description: 'SOUL\uC740 \uAC80\uC99D\uB41C \uC2E0\uB8B0\uB85C \uC5BB\uACE0, SoulBound \uC2A4\uD398\uC774\uC2A4 \uC548\uC5D0\uC11C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.',
        balanceTitle: '\uB0B4 SOUL \uC794\uC561',
        balanceDescription: '\uD604\uC7AC \uACC4\uC815\uC5D0\uC11C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uC2E0\uB8B0 \uC790\uC0B0\uC785\uB2C8\uB2E4.',
        availableLabel: '\uC0AC\uC6A9 \uAC00\uB2A5',
        heldLabel: '\uC784\uC2DC \uBCF4\uB958',
        totalLabel: '\uC804\uCCB4 SOUL',
        currency: 'SOUL',
        activityTitle: 'SOUL \uD750\uB984',
        activityEmpty: '\uC544\uC9C1 SOUL \uD750\uB984\uC774 \uC5C6\uC2B5\uB2C8\uB2E4',
        holdsTitle: '\uC2E0\uB8B0 \uBCF4\uB958',
        holdsEmpty: '\uBCF4\uB958 \uC911\uC778 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4',
        loading: '\uC6D4\uB81B\uC744 \uC5EC\uB294 \uC911\uC785\uB2C8\uB2E4',
        error: 'SOUL \uC6D4\uB81B\uC744 \uC5F4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
        creditPrefix: '+',
        debitPrefix: '\u2212',
        emptyTitle: '\uCCAB SOUL\uC744 \uBC1B\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4',
        emptyBody: '\uC2E0\uB8B0\uAC00 \uC774\uACF3\uC5D0\uC11C SOUL\uC774 \uB429\uB2C8\uB2E4. \uC6F0\uCEF4 SOUL\uB85C \uCCAB \uC2E0\uB8B0 \uC794\uC561\uC744 \uC2DC\uC791\uD558\uC138\uC694.',
        claimWelcomeLabel: '\uC6F0\uCEF4 SOUL \uBC1B\uAE30',
        claimingWelcomeLabel: '\uC6F0\uCEF4 SOUL \uBC1B\uB294 \uC911',
        claimWelcomeError: '\uC6F0\uCEF4 SOUL\uC744 \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
    },
};

export function getWalletCopy(locale: AppLocale): WalletCopy {
    return WALLET_COPY[locale];
}
