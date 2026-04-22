import type { AppLocale } from '../config';

export const RECEIPT_CARD_STATUSES = ['signed', 'updated'] as const;

export type ReceiptCardStatus = (typeof RECEIPT_CARD_STATUSES)[number];

const receiptCardCopy = {
    en: {
        badge: 'Receipt',
        labels: {
            receiptId: 'Receipt',
            issuedAt: 'Issued',
            hash: 'Hash',
            contractVersion: 'Contract version',
            signatory: 'Signatory',
            note: 'Retain this record as documentary evidence.',
        },
        statuses: {
            signed: 'Signed record',
            updated: 'Updated record',
        },
        fixture: {
            routeLabel: 'Receipt card',
            sceneBadge: 'Vocabulary fixture',
            sceneTitle: 'Vocabulary · receipt card',
            sceneDescription: 'Quiet receipted evidence units rendered in documentary language.',
            vocabularyIndexLabel: 'Vocabulary index',
        },
    },
    ko: {
        badge: '영수증',
        labels: {
            receiptId: '영수증',
            issuedAt: '발급 시각',
            hash: '해시',
            contractVersion: '계약 버전',
            signatory: '서명 주체',
            note: '이 기록은 문서 근거로 보관되어야 합니다.',
        },
        statuses: {
            signed: '서명 기록',
            updated: '갱신 기록',
        },
        fixture: {
            routeLabel: '영수증 카드',
            sceneBadge: '어휘 픽스처',
            sceneTitle: '어휘 · 영수증 카드',
            sceneDescription: '차분한 문서 언어로 영수증 근거 단위를 렌더합니다.',
            vocabularyIndexLabel: '어휘 목록',
        },
    },
} as const;

export function getReceiptCardCopy(locale: AppLocale) {
    return receiptCardCopy[locale];
}
