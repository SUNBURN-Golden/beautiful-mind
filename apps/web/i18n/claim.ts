import type { AppLocale } from './config';

type ClaimCopy = {
    title: string;
    typeLabel: string;
    typePlaceholder: string;
    payloadLabel: string;
    payloadPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
    error: string;
    claimError: string;
    loading: string;
};

const CLAIM_COPY: Record<AppLocale, ClaimCopy> = {
    en: {
        title: 'Self-issue SOUL claim',
        typeLabel: 'Claim type',
        typePlaceholder: 'Select claim type',
        payloadLabel: 'Claim details',
        payloadPlaceholder: 'Optional additional details',
        submitLabel: 'Submit claim',
        submittingLabel: 'Submitting',
        successTitle: 'Claim submitted',
        successBody: 'Your self-issued SOUL claim has been recorded.',
        error: 'We couldn\'t load this page.',
        claimError: 'Claim failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: 'SOUL 주장 자가 발급',
        typeLabel: '주장 유형',
        typePlaceholder: '주장 유형을 선택하세요',
        payloadLabel: '주장 상세',
        payloadPlaceholder: '선택 사항 추가 정보',
        submitLabel: '주장 제출',
        submittingLabel: '제출 중',
        successTitle: '주장이 제출되었습니다',
        successBody: 'SOUL 자가 발급 주장이 기록되었습니다.',
        error: '페이지를 불러오지 못했습니다.',
        claimError: '주장 제출에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getClaimCopy(locale: AppLocale): ClaimCopy {
    return CLAIM_COPY[locale];
}
