import type { AppLocale } from './config';

type CollateralCopy = {
    title: string;
    balanceTitle: string;
    availableLabel: string;
    currency: string;
    depositTitle: string;
    amountLabel: string;
    amountPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
    error: string;
    depositError: string;
    loading: string;
};

const COLLATERAL_COPY: Record<AppLocale, CollateralCopy> = {
    en: {
        title: 'Collateral',
        balanceTitle: 'Available SOUL',
        availableLabel: 'Available',
        currency: 'SOUL',
        depositTitle: 'Deposit collateral',
        amountLabel: 'Amount',
        amountPlaceholder: 'Enter SOUL amount',
        submitLabel: 'Deposit',
        submittingLabel: 'Depositing',
        successTitle: 'Deposit submitted',
        successBody: 'Your collateral deposit is being processed.',
        error: 'We couldn\'t load your collateral status.',
        depositError: 'Deposit failed. Please try again.',
        loading: 'Loading collateral',
    },
    ko: {
        title: '예치금',
        balanceTitle: '사용 가능 SOUL',
        availableLabel: '사용 가능',
        currency: 'SOUL',
        depositTitle: '예치금 입금',
        amountLabel: '금액',
        amountPlaceholder: 'SOUL 금액을 입력하세요',
        submitLabel: '예치',
        submittingLabel: '예치 중',
        successTitle: '예치금이 제출되었습니다',
        successBody: '예치금 입금이 처리 중입니다.',
        error: '예치금 정보를 불러오지 못했습니다.',
        depositError: '예치에 실패했습니다. 다시 시도해 주세요.',
        loading: '예치금 불러오는 중',
    },
};

export function getCollateralCopy(locale: AppLocale): CollateralCopy {
    return COLLATERAL_COPY[locale];
}
