import type { AppLocale } from './config';

const landingCopy = {
    en: {
        localeSwitch: {
            label: 'Language',
            english: 'English',
            korean: '한국어',
        },
        badge: 'Selective Trust Network',
        title: 'Trust begins with proof.',
        description: 'SoulBound is a selective, admission-based trust network. Core access opens only after identity, liveness, consent, and document review are complete.',
        signedInCtas: {
            status: 'View admission status',
            dashboard: 'Open ACTIVE dashboard',
            manual: 'Open manual',
        },
        signedOutCtas: {
            start: 'Start admission',
            login: 'Log in',
            manual: 'Open manual',
        },
        cards: [
            {
                title: 'Admission comes first.',
                description: 'Core access opens only after approval.',
            },
            {
                title: 'We verify first.',
                description: 'Connection opens only after identity, liveness, consent, and document review are complete.',
            },
            {
                title: 'Safer because less remains.',
                description: 'Original documents are not retained after review is complete. Minimal claims and decision records remain.',
            },
        ],
        footerLead: 'Trust, by design.',
        footerBuild: 'build',
        footerCommit: 'commit',
    },
    ko: {
        localeSwitch: {
            label: '언어',
            english: 'English',
            korean: '한국어',
        },
        badge: '선별형 신뢰 네트워크',
        title: '신뢰는 검증에서 시작됩니다.',
        description: 'SoulBound는 심사를 거쳐 접근하는 선별형 신뢰 네트워크입니다. 신원, 라이브니스, 동의, 서류 검토가 끝난 뒤에만 핵심 접근이 열립니다.',
        signedInCtas: {
            status: '심사 상태 보기',
            dashboard: '활성 대시보드 열기',
            manual: '가이드 열기',
        },
        signedOutCtas: {
            start: '심사 시작하기',
            login: '로그인',
            manual: '가이드 열기',
        },
        cards: [
            {
                title: '심사가 먼저입니다.',
                description: '승인이 끝난 뒤에만 핵심 접근이 열립니다.',
            },
            {
                title: '먼저 검증합니다.',
                description: '신원, 라이브니스, 동의, 서류 검토가 끝난 뒤에만 연결이 열립니다.',
            },
            {
                title: '덜 남기기에 더 안전합니다.',
                description: '검토가 끝나면 원본 서류는 보관하지 않고, 최소한의 클레임과 결정 기록만 남깁니다.',
            },
        ],
        footerLead: '설계로 지키는 신뢰.',
        footerBuild: '빌드',
        footerCommit: '커밋',
    },
} as const;

export function getLandingCopy(locale: AppLocale) {
    return landingCopy[locale];
}
