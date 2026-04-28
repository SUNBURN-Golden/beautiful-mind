import type { AppLocale } from './config';

const landingCopy = {
    en: {
        localeSwitch: {
            label: 'Language',
            english: 'English',
            korean: '한국어',
        },
        badge: 'Designed for safety.',
        wordmark: 'SoulBound',
        title: 'Limited access. Boundless conversation.',
        titlePhrases: ['Limited access.', 'Boundless conversation.'],
        description:
            'SoulBound requires supporting documents to join. Submitting forged documents may result in civil or criminal liability.',
        actionNote:
            'Open conversation, built on safety.',
        signedInCtas: {
            primary: 'Open your space',
            secondary: null,
        },
        signedOutCtas: {
            primary: 'Join SoulBound',
            secondary: 'Dive into SoulBound',
        },
        support: {
            badge: 'Trust is the asset.',
            title: 'A social-bounding commune for verified people.',
            description:
                'Submitted documents are deleted after review.\nOnly the fact of verification remains.',
        },
    },
    ko: {
        localeSwitch: {
            label: '언어',
            english: 'English',
            korean: '한국어',
        },
        badge: '안전 기반 SoulBound 커뮤니티',
        wordmark: 'SoulBound',
        title: '입장은 까다롭게. 대화는 자유롭게.',
        titlePhrases: ['입장은 까다롭게.', '대화는 자유롭게.'],
        description:
            'SoulBound 가입시 증빙서류들이 필요합니다. 위조 서류 제출시 민형사상 책임을 질 수 있습니다.',
        actionNote:
            '안전 설계, 자유 대화.',
        signedInCtas: {
            primary: '내 스페이스 열기',
            secondary: null,
        },
        signedOutCtas: {
            primary: 'SoulBound 가입하기',
            secondary: 'SoulBound로 들어가기',
        },
        support: {
            badge: '신뢰가 자산.',
            title: '검증된 사람들의 소셜바운딩 꼬뮨.',
            description:
                '제출서류는 검토 즉시 삭제됩니다.\n검토 완료 사실만 기록됩니다.',
        },
    },
} as const;

export function getLandingCopy(locale: AppLocale) {
    return landingCopy[locale];
}
