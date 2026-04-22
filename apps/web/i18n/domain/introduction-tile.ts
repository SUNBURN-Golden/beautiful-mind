import type { AppLocale } from '../config';

export const INTRODUCTION_TILE_STATES = ['documented', 'held'] as const;

export type IntroductionTileState = (typeof INTRODUCTION_TILE_STATES)[number];

const introductionTileCopy = {
    en: {
        badge: 'Introduction record',
        freezeNotice: 'Fixture vocabulary only. Live promotion remains frozen for this phase.',
        labels: {
            sponsor: 'Introduced by',
            counterpart: 'Counterpart record',
            sharedBasis: 'Shared basis',
            hash: 'Reference hash',
            contractVersion: 'Contract version',
        },
        states: {
            documented: {
                title: 'Documented introduction record',
                description: 'The introduction language is present as a documentary reference only.',
            },
            held: {
                title: 'Held introduction record',
                description: 'The introduction language is reserved, but no live promotion is permitted in this phase.',
            },
        },
        fixture: {
            routeLabel: 'Introduction tile',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · introduction tile',
            sceneDescription: 'Fixture-only introduction language held apart from any live product wiring.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '소개 기록',
        freezeNotice: '픽스처용 어휘만 허용됩니다. 라이브 승격은 이번 단계에서 동결 상태입니다.',
        labels: {
            sponsor: '소개 주체',
            counterpart: '상대 기록',
            sharedBasis: '공유 근거',
            hash: '참조 해시',
            contractVersion: '계약 버전',
        },
        states: {
            documented: {
                title: '문서화된 소개 기록',
                description: '소개 문구는 문서 참조로만 존재하며 다른 라이브 동작에 연결되지 않습니다.',
            },
            held: {
                title: '보류된 소개 기록',
                description: '소개 어휘는 보존되지만, 이번 단계에서는 어떤 라이브 승격도 허용되지 않습니다.',
            },
        },
        fixture: {
            routeLabel: '소개 타일',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 소개 타일',
            sceneDescription: '라이브 제품 연결 없이 분리된 픽스처 전용 소개 어휘를 보여줍니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getIntroductionTileCopy(locale: AppLocale) {
    return introductionTileCopy[locale];
}
