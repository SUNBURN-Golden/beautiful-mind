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
        titlePhrases: ['We write the terms', 'before we exchange a word.'],
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
            title: 'Access follows a recorded admission process.',
            description:
                'Technical references stay on file for support and audit. The ordinary view keeps the terms, consent trail, and review boundary clear before entry.',
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
        titlePhrases: ['우리는', '한 마디를 건네기 전에', '약속을 적어둡니다.'],
        description:
            'SoulBound는 사적인 초대의 문턱에서 시작됩니다. 신원, 동의, 문서 검토가 정돈되기 전에는 이 방이 열리지 않습니다.',
        actionNote:
            '접근은 기록 뒤에 옵니다. 대화는 두 사람의 조건이 같은 문서 위에 놓인 뒤에만 시작됩니다.',
        signedInCtas: {
            primary: '입회 기록을 검토합니다',
            secondary: null,
        },
        signedOutCtas: {
            primary: '입회 약관 검토하기',
            secondary: '기존 기록 이어가기',
        },
        support: {
            badge: '접근보다 먼저 기록',
            title: '접근은 기록된 입회 절차 위에서 열립니다.',
            description:
                '기술 식별자는 지원과 감사 기록 안에 보관합니다. 일반 화면에는 입장 전에 확인해야 할 약관, 동의 이력, 검토 경계만 분명하게 남깁니다.',
        },
    },
} as const;

export function getLandingCopy(locale: AppLocale) {
    return landingCopy[locale];
}
