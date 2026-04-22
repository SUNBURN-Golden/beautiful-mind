import type { AppLocale } from '../config';

export const SHARED_CONTEXT_RAIL_KINDS = [
    'institution',
    'credential',
    'jurisdiction',
    'co-signature',
    'contract',
] as const;

export type SharedContextRailKind = (typeof SHARED_CONTEXT_RAIL_KINDS)[number];

const sharedContextRailCopy = {
    en: {
        badge: 'Shared context',
        title: 'Provable shared-context rail',
        description: 'Only documentary, jurisdictional, credential, or witness-backed context belongs here.',
        labels: {
            evidence: 'Evidence note',
            hash: 'Hash',
            emptyTitle: 'No provable shared context is attached yet.',
            emptyDescription: 'This rail stays empty until a documentary or witness-backed basis is recorded.',
        },
        kinds: {
            institution: 'Institution',
            credential: 'Credential',
            jurisdiction: 'Jurisdiction',
            'co-signature': 'Co-signature',
            contract: 'Contract',
        },
        fixture: {
            routeLabel: 'Shared context rail',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · shared-context rail',
            sceneDescription: 'Provable shared-context items rendered without hobby or interest language.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '공유 맥락',
        title: '증명 가능한 공유 맥락 레일',
        description: '문서, 관할, 자격, 증인 근거가 있는 맥락만 이 영역에 배치됩니다.',
        labels: {
            evidence: '근거 메모',
            hash: '해시',
            emptyTitle: '연결된 증명 가능 공유 맥락이 아직 없습니다.',
            emptyDescription: '문서 또는 증인 기반 근거가 기록되기 전까지 이 레일은 비어 있습니다.',
        },
        kinds: {
            institution: '기관',
            credential: '자격',
            jurisdiction: '관할',
            'co-signature': '공동 서명',
            contract: '계약',
        },
        fixture: {
            routeLabel: '공유 맥락 레일',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 공유 맥락 레일',
            sceneDescription: '취향이나 관심사 언어 없이 증명 가능한 공유 맥락만 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getSharedContextRailCopy(locale: AppLocale) {
    return sharedContextRailCopy[locale];
}
