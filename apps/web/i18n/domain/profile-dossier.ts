import type { AppLocale } from '../config';

const profileDossierCopy = {
    en: {
        badge: 'Profile dossier',
        title: 'Minimal dossier snapshot',
        description: 'Phase 7 keeps the dossier limited to standing, eligibility, and reference lines only.',
        labels: {
            jurisdiction: 'Jurisdiction',
            minimalOnly: 'Only the minimal snapshot is rendered in this phase.',
            eligibilityTitle: 'Eligibility markers',
            referencesTitle: 'Reference lines',
            emptyEligibility: 'No eligibility markers are attached yet.',
            extendedReserved: 'Extended dossier scope is reserved only.',
        },
        fixture: {
            routeLabel: 'Profile dossier',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · profile dossier',
            sceneDescription: 'Minimal dossier vocabulary rendered without richer profile scope.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '프로필 기록',
        title: '최소 프로필 기록',
        description: 'Phase 7에서는 프로필을 상태, 자격, 참조 줄만 포함하는 최소 기록 범위로 유지합니다.',
        labels: {
            jurisdiction: '관할',
            minimalOnly: '이번 단계에서는 최소 스냅샷만 렌더합니다.',
            eligibilityTitle: '자격 표식',
            referencesTitle: '참조 줄',
            emptyEligibility: '연결된 자격 표식이 아직 없습니다.',
            extendedReserved: '확장 프로필 기록 범위는 예약만 되어 있습니다.',
        },
        fixture: {
            routeLabel: '프로필 기록',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 프로필 기록',
            sceneDescription: '더 넓은 프로필 범위 없이 최소 기록 어휘만 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getProfileDossierCopy(locale: AppLocale) {
    return profileDossierCopy[locale];
}
