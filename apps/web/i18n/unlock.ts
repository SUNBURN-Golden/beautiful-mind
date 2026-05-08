import type { AppLocale } from './config';

type UnlockCopy = {
    title: string;
    eyebrow: string;
    description: string;
    sessionIdLabel: string;
    sessionIdHelper: string;
    sessionIdPlaceholder: string;
    feeLabel: string;
    feeDescription: string;
    safetyNote: string;
    confirmLabel: string;
    confirmingLabel: string;
    successTitle: string;
    successBody: string;
    error: string;
    unlockError: string;
    loading: string;
};

const UNLOCK_COPY: Record<AppLocale, UnlockCopy> = {
    en: {
        title: 'Request access unlock.',
        eyebrow: 'Trust-gated access',
        description: 'Access opens when trust and proof line up. Some rooms stay closed until verification is complete.',
        sessionIdLabel: 'Review session reference',
        sessionIdHelper: 'Early flow: paste the operational review session reference you were given.',
        sessionIdPlaceholder: 'Paste session reference',
        feeLabel: 'SOUL unlock commitment',
        feeDescription: 'A SOUL fee is required to request access for this review session.',
        safetyNote: 'This does not bypass review. It asks the system to unlock access when the trust requirements are met.',
        confirmLabel: 'Request unlock',
        confirmingLabel: 'Unlocking',
        successTitle: 'Unlock request submitted',
        successBody: 'Your review session unlock request has been recorded.',
        error: 'We couldn\'t load this page.',
        unlockError: 'Unlock failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: '접근 열기를 요청합니다.',
        eyebrow: '신뢰 기반 접근',
        description: '신뢰와 증빙이 맞을 때 다음 문이 열립니다. 검증이 끝나기 전에는 일부 공간이 닫혀 있습니다.',
        sessionIdLabel: '리뷰 세션 식별자',
        sessionIdHelper: '초기 흐름입니다. 전달받은 운영용 리뷰 세션 식별자를 붙여 넣으세요.',
        sessionIdPlaceholder: '세션 식별자 붙여넣기',
        feeLabel: 'SOUL 열기 약속',
        feeDescription: '이 리뷰 세션의 접근을 요청하려면 SOUL 수수료가 필요합니다.',
        safetyNote: '이 흐름은 검토를 우회하지 않습니다. 신뢰 조건이 맞을 때 접근을 열도록 요청합니다.',
        confirmLabel: '접근 열기 요청',
        confirmingLabel: '언락 중',
        successTitle: '접근 열기 요청이 제출되었습니다',
        successBody: '리뷰 세션 접근 열기 요청이 기록되었습니다.',
        error: '페이지를 불러오지 못했습니다.',
        unlockError: '언락에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getUnlockCopy(locale: AppLocale): UnlockCopy {
    return UNLOCK_COPY[locale];
}
