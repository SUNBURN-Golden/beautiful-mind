import type { AppLocale } from './config';

type UnlockCopy = {
    title: string;
    sessionIdLabel: string;
    sessionIdPlaceholder: string;
    feeLabel: string;
    feeDescription: string;
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
        title: 'Unlock review',
        sessionIdLabel: 'Session ID',
        sessionIdPlaceholder: 'Enter review session ID',
        feeLabel: 'Unlock fee',
        feeDescription: 'A SOUL fee is required to unlock this review session.',
        confirmLabel: 'Confirm unlock',
        confirmingLabel: 'Unlocking',
        successTitle: 'Review unlocked',
        successBody: 'Your review session has been unlocked.',
        error: 'We couldn\'t load this page.',
        unlockError: 'Unlock failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: '리뷰 언락',
        sessionIdLabel: '세션 ID',
        sessionIdPlaceholder: '리뷰 세션 ID를 입력하세요',
        feeLabel: '언락 수수료',
        feeDescription: '이 리뷰 세션을 언락하려면 SOUL 수수료가 필요합니다.',
        confirmLabel: '언락 확인',
        confirmingLabel: '언락 중',
        successTitle: '리뷰가 언락되었습니다',
        successBody: '리뷰 세션이 언락되었습니다.',
        error: '페이지를 불러오지 못했습니다.',
        unlockError: '언락에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getUnlockCopy(locale: AppLocale): UnlockCopy {
    return UNLOCK_COPY[locale];
}
