import type { AppLocale } from '../config';

const trustRibbonCopy = {
    en: {
        badge: 'Trust ribbon',
        labels: {
            evidence: 'Supporting record',
            hash: 'Hash',
            timestamp: 'Recorded',
        },
        fixture: {
            routeLabel: 'Trust ribbon',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · trust ribbon',
            sceneDescription: 'Quiet trust-status strip language with secondary documentary evidence.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
        levels: {
            verified: {
                title: 'Verified standing on file',
                description: 'The current trust record is fully documented.',
            },
            partial: {
                title: 'Partial standing on file',
                description: 'Some trust evidence is documented, but the standing is not yet complete.',
            },
            pending: {
                title: 'Standing under review',
                description: 'A trust record has been opened and is awaiting documentary confirmation.',
            },
            none: {
                title: 'No standing on file',
                description: 'No trust record has been attached to this view yet.',
            },
        },
    },
    ko: {
        badge: '신뢰 리본',
        labels: {
            evidence: '보조 기록',
            hash: '해시',
            timestamp: '기록 시각',
        },
        fixture: {
            routeLabel: '신뢰 리본',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 신뢰 리본',
            sceneDescription: '조용한 신뢰 상태 스트립과 보조 문서 근거 문구를 함께 보여줍니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
        levels: {
            verified: {
                title: '검증된 상태가 기록되어 있습니다',
                description: '현재 신뢰 기록이 완전한 문서 근거와 함께 보관되어 있습니다.',
            },
            partial: {
                title: '부분 상태가 기록되어 있습니다',
                description: '일부 신뢰 근거는 기록되었지만, 상태는 아직 완결되지 않았습니다.',
            },
            pending: {
                title: '상태 검토 중',
                description: '신뢰 기록이 접수되었으며 문서 확인을 기다리고 있습니다.',
            },
            none: {
                title: '기록된 상태가 없습니다',
                description: '이 화면에 연결된 신뢰 기록이 아직 없습니다.',
            },
        },
    },
} as const;

export function getTrustRibbonCopy(locale: AppLocale) {
    return trustRibbonCopy[locale];
}
