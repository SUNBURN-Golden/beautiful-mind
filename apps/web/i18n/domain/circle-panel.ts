import type { AppLocale } from '../config';

export const CIRCLE_PANEL_LENS_KINDS = [
    'institution',
    'household',
    'practice',
    'contract',
] as const;

export type CirclePanelLensKind = (typeof CIRCLE_PANEL_LENS_KINDS)[number];

const circlePanelCopy = {
    en: {
        badge: 'Circle lens',
        labels: {
            staticLens: 'Static lens',
            evidenceTitle: 'Documented basis',
            lastReviewed: 'Last review',
            noEvidence: 'No documentary basis is attached to this lens yet.',
            readOnlyNote: 'This panel remains a read-only lens over documented shared context.',
        },
        lenses: {
            institution: 'Institution lens',
            household: 'Household lens',
            practice: 'Practice lens',
            contract: 'Contract lens',
        },
        fixture: {
            routeLabel: 'Circle panel',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · circle panel',
            sceneDescription: 'Read-only circle lenses rendered as static documented context blocks.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '서클 렌즈',
        labels: {
            staticLens: '정적 렌즈',
            evidenceTitle: '문서 근거',
            lastReviewed: '마지막 검토',
            noEvidence: '이 렌즈에 연결된 문서 근거가 아직 없습니다.',
            readOnlyNote: '이 패널은 문서화된 공유 맥락을 보여주는 읽기 전용 렌즈로만 유지됩니다.',
        },
        lenses: {
            institution: '기관 렌즈',
            household: '가구 렌즈',
            practice: '실천 렌즈',
            contract: '계약 렌즈',
        },
        fixture: {
            routeLabel: '서클 패널',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 서클 패널',
            sceneDescription: '읽기 전용 서클 렌즈를 정적인 문서 맥락 블록으로 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getCirclePanelCopy(locale: AppLocale) {
    return circlePanelCopy[locale];
}
