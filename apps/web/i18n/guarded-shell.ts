import type { AppLocale } from './config';

type GuardedShellNavItem = {
    label: string;
    reason?: string;
};

type GuardedShellCopy = {
    brand: string;
    eyebrow: string;
    navLabel: string;
    languageLabel: string;
    englishLabel: string;
    koreanLabel: string;
    disabledReason: string;
    signOutBusy: string;
    nav: {
        dashboard: GuardedShellNavItem;
        wallet: GuardedShellNavItem;
        status: GuardedShellNavItem;
        proposals: GuardedShellNavItem;
        correspondence: GuardedShellNavItem;
        trustRecords: GuardedShellNavItem;
        reporting: GuardedShellNavItem;
        participation: GuardedShellNavItem;
    };
};

const GUARDED_SHELL_COPY: Record<AppLocale, GuardedShellCopy> = {
    en: {
        brand: 'SoulBound',
        eyebrow: 'Designed for safety. Trust becomes SOUL.',
        navLabel: 'SoulBound space navigation',
        languageLabel: 'Language',
        englishLabel: 'EN',
        koreanLabel: 'KO',
        disabledReason: 'Not open yet',
        signOutBusy: 'Signing out',
        nav: {
            dashboard: { label: 'My space' },
            wallet: { label: 'Wallet' },
            status: { label: 'Review status' },
            proposals: { label: 'Friend recommendations', reason: 'Not open yet' },
            correspondence: { label: 'Direct messages', reason: 'Not open yet' },
            trustRecords: { label: 'Trust notes', reason: 'Not open yet' },
            reporting: { label: 'Reports', reason: 'Not open yet' },
            participation: { label: 'Participation', reason: 'Not open yet' },
        },
    },
    ko: {
        brand: 'SoulBound',
        eyebrow: '안전 기반 커뮤니티 · 신뢰가 SOUL이 됩니다',
        navLabel: 'SoulBound 스페이스 내비게이션',
        languageLabel: '언어',
        englishLabel: 'EN',
        koreanLabel: 'KO',
        disabledReason: '아직 열리지 않음',
        signOutBusy: '로그아웃 중',
        nav: {
            dashboard: { label: '내 스페이스' },
            wallet: { label: '월렛' },
            status: { label: '심사 현황' },
            proposals: { label: '친구 추천', reason: '아직 열리지 않음' },
            correspondence: { label: '다이렉트 메시지', reason: '아직 열리지 않음' },
            trustRecords: { label: '신뢰 노트', reason: '아직 열리지 않음' },
            reporting: { label: '신고', reason: '아직 열리지 않음' },
            participation: { label: '참여 상태', reason: '아직 열리지 않음' },
        },
    },
};

export function getGuardedShellCopy(locale: AppLocale): GuardedShellCopy {
    return GUARDED_SHELL_COPY[locale];
}
