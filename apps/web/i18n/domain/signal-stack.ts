import type { AppLocale } from '../config';

export const SIGNAL_STACK_KINDS = [
    'verify.id.completed',
    'verify.doc.completed',
    'consent.clause.signed',
    'contract.signed',
    'contract.updated',
    'receipt.generated',
] as const;

export type SignalStackKind = (typeof SIGNAL_STACK_KINDS)[number];

const signalStackCopy = {
    en: {
        badge: 'Verified signals',
        title: 'Verified signal trail',
        description: 'Receipt-backed verification and contract records only.',
        labels: {
            hash: 'Hash',
            contractVersion: 'Contract version',
            receiptId: 'Receipt',
            recordedAt: 'Recorded',
            emptyTitle: 'No verified signals are on file yet.',
            emptyDescription: 'Signals appear once documentary evidence is generated for the current record.',
        },
        kinds: {
            'verify.id.completed': 'Identity verified',
            'verify.doc.completed': 'Document verified',
            'consent.clause.signed': 'Consent clause signed',
            'contract.signed': 'Contract signed',
            'contract.updated': 'Contract updated',
            'receipt.generated': 'Receipt generated',
        },
        fixture: {
            routeLabel: 'Signal stack',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · signal stack',
            sceneDescription: 'Enum-mapped verified signal language rendered without feed semantics.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '검증 신호',
        title: '검증 신호 흐름',
        description: '영수증 근거가 있는 검증 및 계약 기록만 표시합니다.',
        labels: {
            hash: '해시',
            contractVersion: '계약 버전',
            receiptId: '영수증',
            recordedAt: '기록 시각',
            emptyTitle: '기록된 검증 신호가 아직 없습니다.',
            emptyDescription: '현재 기록에 대한 문서 근거가 생성되면 신호가 표시됩니다.',
        },
        kinds: {
            'verify.id.completed': '신원 검증 완료',
            'verify.doc.completed': '문서 검증 완료',
            'consent.clause.signed': '동의 조항 서명 완료',
            'contract.signed': '계약 서명 완료',
            'contract.updated': '계약 갱신 기록',
            'receipt.generated': '영수증 생성 완료',
        },
        fixture: {
            routeLabel: '신호 스택',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 신호 스택',
            sceneDescription: '피드 의미를 배제한 enum 기반 검증 신호 문구를 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getSignalStackCopy(locale: AppLocale) {
    return signalStackCopy[locale];
}
