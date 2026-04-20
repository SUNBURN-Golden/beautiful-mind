import type { AppLocale } from './config';

const landingCopy = {
    en: {
        localeSwitch: {
            label: 'Language',
            english: 'English',
            korean: '한국어',
        },
        badge: 'Private invitation',
        wordmark: 'SoulBound',
        title: 'We write the terms before we exchange a word.',
        description:
            'SoulBound opens as a private invitation stage. The room remains closed until identity, consent, and documentary review are in order.',
        actionNote:
            'Access follows the record. Conversation begins only after the terms can be held by both parties.',
        signedInCtas: {
            primary: 'Review your admission record',
            secondary: null,
        },
        signedOutCtas: {
            primary: 'Review the admission terms',
            secondary: 'Resume an existing record',
        },
        support: {
            badge: 'Recorded before access',
            description:
                'Each invitation begins as a receipted record. The room stays closed until the terms, consent trail, and review state can be held on file.',
        },
        receipt: {
            title: 'Invitation terms on file',
            receiptId: 'INV-5.5-LANDING',
            issuedAt: '20 Apr 2026 / Stage 5',
            hash: '0x8b29c4d917f4a8e1d55a62b3c7145f09',
            contractVersion: 'stage5.landing.invitation.v1',
            signatory: 'SoulBound registry',
            status: 'signed',
        },
        meta: {
            build: 'build',
            commit: 'commit',
        },
    },
    ko: {
        localeSwitch: {
            label: '언어',
            english: 'English',
            korean: '한국어',
        },
        badge: '사적인 초대',
        wordmark: 'SoulBound',
        title: '우리는 한 마디를 건네기 전에 약속을 적어둡니다.',
        description:
            'SoulBound는 사적인 초대의 문턱에서 시작됩니다. 신원, 동의, 문서 검토가 정돈되기 전에는 이 방이 열리지 않습니다.',
        actionNote:
            '접근은 기록 뒤에 옵니다. 대화는 두 사람의 조건이 같은 문서 위에 놓인 뒤에만 시작됩니다.',
        signedInCtas: {
            primary: '입회 기록을 검토합니다',
            secondary: null,
        },
        signedOutCtas: {
            primary: '입회 약관을 검토합니다',
            secondary: '기존 기록을 이어갑니다',
        },
        support: {
            badge: '접근보다 먼저 기록',
            description:
                '모든 초대는 영수증처럼 남는 기록으로 시작됩니다. 약관, 동의 이력, 검토 상태가 문서로 정리되기 전에는 이 방이 열리지 않습니다.',
        },
        receipt: {
            title: '초대 약관이 기록되어 있습니다',
            receiptId: 'INV-5.5-LANDING',
            issuedAt: '2026년 4월 20일 / Stage 5',
            hash: '0x8b29c4d917f4a8e1d55a62b3c7145f09',
            contractVersion: 'stage5.landing.invitation.v1',
            signatory: 'SoulBound 등록부',
            status: 'signed',
        },
        meta: {
            build: '빌드',
            commit: '커밋',
        },
    },
} as const;

export function getLandingCopy(locale: AppLocale) {
    return landingCopy[locale];
}
