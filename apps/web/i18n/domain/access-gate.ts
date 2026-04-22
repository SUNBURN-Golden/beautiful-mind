import type { AppLocale } from '../config';

const accessGateCopy = {
    en: {
        badge: 'Access gate',
        detailsTitle: 'Record references',
        fixture: {
            routeLabel: 'Access gate',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · access gate',
            sceneDescription: 'Trust-first gate language rendered from fixed documentary references only.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
        stages: {
            verify: {
                label: 'Verification required',
                title: 'Identity verification is the current gate.',
                description: 'Access remains withheld until the submitted identity record is reviewed against the standing requirements.',
                note: 'Only documentary verification can move this gate.',
            },
            consent: {
                label: 'Consent required',
                title: 'Consent acknowledgement is the current gate.',
                description: 'Verification has cleared. Access is still withheld until the required consent clauses are signed on record.',
                note: 'Unsigned consent language keeps the gate closed.',
            },
            contract: {
                label: 'Contract signature required',
                title: 'Contract execution is the current gate.',
                description: 'Verification and consent are recorded. Access opens only after the active contract version is signed.',
                note: 'Only the active contract version satisfies this gate.',
            },
            passed: {
                label: 'Gate cleared',
                title: 'The access gate is cleared on record.',
                description: 'The required verification, consent, and contract records are present for the current standing.',
                note: 'Access remains tied to the current signed record set.',
            },
        },
    },
    ko: {
        badge: '접근 게이트',
        detailsTitle: '기록 참조',
        fixture: {
            routeLabel: '접근 게이트',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 접근 게이트',
            sceneDescription: '신뢰 우선 접근 게이트 문구를 고정된 문서 참조만으로 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
        stages: {
            verify: {
                label: '검증 필요',
                title: '현재 게이트는 신원 검증입니다.',
                description: '제출된 신원 기록이 기준 요건과 대조되어 검토되기 전까지 접근은 보류됩니다.',
                note: '문서 기반 검증만 이 게이트를 넘어가게 합니다.',
            },
            consent: {
                label: '동의 필요',
                title: '현재 게이트는 동의 확인입니다.',
                description: '검증은 통과했지만, 필요한 동의 조항이 기록상 서명되기 전까지 접근은 열리지 않습니다.',
                note: '서명되지 않은 동의 문구는 게이트를 닫아 둡니다.',
            },
            contract: {
                label: '계약 서명 필요',
                title: '현재 게이트는 계약 체결입니다.',
                description: '검증과 동의는 기록되었으며, 현재 유효한 계약 버전이 서명되어야 접근이 열립니다.',
                note: '현재 계약 버전만 이 게이트를 충족합니다.',
            },
            passed: {
                label: '게이트 통과',
                title: '접근 게이트가 기록상 해제되었습니다.',
                description: '현재 기준에 필요한 검증, 동의, 계약 기록이 모두 갖추어져 있습니다.',
                note: '접근 권한은 현재 서명된 기록 묶음에 계속 묶여 있습니다.',
            },
        },
    },
} as const;

export function getAccessGateCopy(locale: AppLocale) {
    return accessGateCopy[locale];
}
