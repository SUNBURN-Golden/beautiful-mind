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
        eyebrow: 'Admission-first access',
        navLabel: 'Guarded navigation',
        languageLabel: 'Language',
        englishLabel: 'EN',
        koreanLabel: 'KO',
        disabledReason: 'Not available yet',
        signOutBusy: 'Signing out',
        nav: {
            dashboard: { label: 'Dashboard' },
            status: { label: 'Current status' },
            proposals: { label: 'Proposals', reason: 'Not available yet' },
            correspondence: { label: 'Correspondence', reason: 'Not available yet' },
            trustRecords: { label: 'Trust records', reason: 'Not available yet' },
            reporting: { label: 'Reporting', reason: 'Not available yet' },
            participation: { label: 'Participation', reason: 'Not available yet' },
        },
    },
    ko: {
        brand: 'SoulBound',
        eyebrow: '입장 우선 접근',
        navLabel: 'Guarded navigation',
        languageLabel: '언어',
        englishLabel: 'EN',
        koreanLabel: 'KO',
        disabledReason: '아직 열리지 않았습니다',
        signOutBusy: '로그아웃 중',
        nav: {
            dashboard: { label: '대시보드' },
            status: { label: '현재 상태' },
            proposals: { label: '제안', reason: '아직 열리지 않았습니다' },
            correspondence: { label: '대화', reason: '아직 열리지 않았습니다' },
            trustRecords: { label: 'Trust 기록', reason: '아직 열리지 않았습니다' },
            reporting: { label: '신고', reason: '아직 열리지 않았습니다' },
            participation: { label: '참여 설정', reason: '아직 열리지 않았습니다' },
        },
    },
};

export function getGuardedShellCopy(locale: AppLocale): GuardedShellCopy {
    return GUARDED_SHELL_COPY[locale];
}
