import type { AppLocale } from './config';

type CollateralCopy = {
    title: string;
    eyebrow: string;
    description: string;
    balanceTitle: string;
    availableLabel: string;
    currency: string;
    depositTitle: string;
    depositDescription: string;
    amountLabel: string;
    amountHelper: string;
    amountPlaceholder: string;
    riskNote: string;
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
        title: 'Back trust with SOUL.',
        eyebrow: 'Early operational flow',
        description: 'Collateral makes serious actions harder to fake. Use this only when you understand the commitment.',
        balanceTitle: 'Available SOUL',
        availableLabel: 'Available',
        currency: 'SOUL',
        depositTitle: 'Commit SOUL collateral',
        depositDescription: 'This skeleton records a SOUL-backed commitment while the final selection flow is still being shaped.',
        amountLabel: 'SOUL amount',
        amountHelper: 'Enter the amount you are willing to place behind this trust commitment.',
        amountPlaceholder: 'Enter SOUL amount',
        riskNote: 'Collateral can be held or deducted by later safety rules. Do not continue casually.',
        submitLabel: 'Back with SOUL',
        submittingLabel: 'Committing SOUL',
        successTitle: 'Collateral commitment submitted',
        successBody: 'Your SOUL-backed commitment is being processed.',
        error: 'We couldn\'t load your collateral status.',
        depositError: 'Collateral commitment failed. Please try again.',
        loading: 'Loading collateral',
    },
    ko: {
        title: '신뢰를 SOUL로 뒷받침합니다.',
        eyebrow: '초기 운영 흐름',
        description: '담보는 가벼운 행동을 줄이는 장치입니다. 이 약속의 의미를 이해한 뒤 진행하세요.',
        balanceTitle: '사용 가능 SOUL',
        availableLabel: '사용 가능',
        currency: 'SOUL',
        depositTitle: 'SOUL 담보 약속',
        depositDescription: '최종 선택 흐름이 완성되기 전, 이 스켈레톤은 SOUL로 뒷받침한 약속을 기록합니다.',
        amountLabel: 'SOUL 수량',
        amountHelper: '이 신뢰 약속에 걸 수 있는 SOUL 수량을 입력하세요.',
        amountPlaceholder: 'SOUL 금액을 입력하세요',
        riskNote: '담보는 이후 안전 규칙에 따라 보류되거나 차감될 수 있습니다. 가볍게 진행하지 마세요.',
        submitLabel: 'SOUL로 뒷받침하기',
        submittingLabel: 'SOUL 약속 중',
        successTitle: '담보 약속이 제출되었습니다',
        successBody: 'SOUL로 뒷받침한 약속이 처리 중입니다.',
        error: '예치금 정보를 불러오지 못했습니다.',
        depositError: '담보 약속에 실패했습니다. 다시 시도해 주세요.',
        loading: '예치금 불러오는 중',
    },
};

export function getCollateralCopy(locale: AppLocale): CollateralCopy {
    return COLLATERAL_COPY[locale];
}
