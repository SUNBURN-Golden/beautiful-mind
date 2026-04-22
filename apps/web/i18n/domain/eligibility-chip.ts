import type { AppLocale } from '../config';

export const ELIGIBILITY_CHIP_KINDS = [
    'identity',
    'consent',
    'document',
    'contract',
    'standing',
    'shared-context',
] as const;

export type EligibilityChipKind = (typeof ELIGIBILITY_CHIP_KINDS)[number];

const eligibilityChipCopy = {
    en: {
        fixture: {
            routeLabel: 'Eligibility chip',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · eligibility chip',
            sceneDescription: 'Inline eligibility markers rendered in restrained record language.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
        kinds: {
            identity: 'Identity',
            consent: 'Consent',
            document: 'Documents',
            contract: 'Contract',
            standing: 'Standing',
            'shared-context': 'Shared context',
        },
        states: {
            met: 'Met',
            pending: 'Pending',
            locked: 'Locked',
        },
    },
    ko: {
        fixture: {
            routeLabel: '자격 칩',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 자격 칩',
            sceneDescription: '절제된 기록 언어로 표시되는 인라인 자격 표식을 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
        kinds: {
            identity: '신원',
            consent: '동의',
            document: '문서',
            contract: '계약',
            standing: '상태',
            'shared-context': '공유 맥락',
        },
        states: {
            met: '충족',
            pending: '대기',
            locked: '잠김',
        },
    },
} as const;

export function getEligibilityChipCopy(locale: AppLocale) {
    return eligibilityChipCopy[locale];
}
