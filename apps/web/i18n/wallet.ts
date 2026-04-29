import type { AppLocale } from './config';

type WalletCopy = {
    title: string;
    balanceTitle: string;
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
        balanceTitle: 'SOUL balance',
        availableLabel: 'Available',
        heldLabel: 'Held',
        totalLabel: 'Total balance',
        currency: 'SOUL',
        activityTitle: 'Recent activity',
        activityEmpty: 'No activity yet',
        holdsTitle: 'Active holds',
        holdsEmpty: 'No active holds',
        loading: 'Loading your wallet',
        error: 'We couldn\'t load your wallet.',
        creditPrefix: '+',
        debitPrefix: '\u2212',
        emptyTitle: 'Your wallet is empty',
        emptyBody: 'SOUL credits will appear here once you receive your first grant or reward.',
        claimWelcomeLabel: 'Claim welcome SOUL',
        claimingWelcomeLabel: 'Claiming welcome SOUL',
        claimWelcomeError: 'We could not claim welcome SOUL. Please try again.',
    },
    ko: {
        title: '\uC6D4\uB81B',
        balanceTitle: 'SOUL \uC794\uC561',
        availableLabel: '\uC0AC\uC6A9 \uAC00\uB2A5',
        heldLabel: '\uBCF4\uB958 \uC911',
        totalLabel: '\uC804\uCCB4 \uC794\uC561',
        currency: 'SOUL',
        activityTitle: '\uCD5C\uADFC \uD65C\uB3D9',
        activityEmpty: '\uC544\uC9C1 \uD65C\uB3D9 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4',
        holdsTitle: '\uBCF4\uB958 \uC911\uC778 SOUL',
        holdsEmpty: '\uBCF4\uB958 \uC911\uC778 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4',
        loading: '\uC6D4\uB81B\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4',
        error: '\uC6D4\uB81B\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
        creditPrefix: '+',
        debitPrefix: '\u2212',
        emptyTitle: '\uC6D4\uB81B\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4',
        emptyBody: '\uCCAB \uC9C0\uAE09 \uB610\uB294 \uBCF4\uC0C1\uC744 \uBC1B\uC73C\uBA74 SOUL \uD06C\uB808\uB514\uD2B8\uAC00 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.',
        claimWelcomeLabel: '\uC6F0\uCEF4 SOUL \uBC1B\uAE30',
        claimingWelcomeLabel: '\uC6F0\uCEF4 SOUL \uBC1B\uB294 \uC911',
        claimWelcomeError: '\uC6F0\uCEF4 SOUL\uC744 \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
    },
};

export function getWalletCopy(locale: AppLocale): WalletCopy {
    return WALLET_COPY[locale];
}
