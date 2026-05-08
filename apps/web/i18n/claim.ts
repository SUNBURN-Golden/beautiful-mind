import type { AppLocale } from './config';

type ClaimCopy = {
    title: string;
    eyebrow: string;
    description: string;
    typeLabel: string;
    typeHelper: string;
    typePlaceholder: string;
    payloadLabel: string;
    payloadHelper: string;
    payloadPlaceholder: string;
    operationalNote: string;
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
    error: string;
    claimError: string;
    loading: string;
};

const CLAIM_COPY: Record<AppLocale, ClaimCopy> = {
    en: {
        title: 'Claim SOUL from verified trust.',
        eyebrow: 'Proof-backed SOUL claim',
        description: 'This early flow records a proof-backed claim. The final product flow will replace operational fields with safer selection steps.',
        typeLabel: 'SOUL claim type',
        typeHelper: 'Use the operational claim type provided for this trust proof.',
        typePlaceholder: 'Enter claim type',
        payloadLabel: 'Operational claim details',
        payloadHelper: 'Optional JSON details remain operational for now. Keep the shape provided by the review flow.',
        payloadPlaceholder: 'Optional JSON details',
        operationalNote: 'Payload details remain an early operational field, not the final user experience.',
        submitLabel: 'Record SOUL claim',
        submittingLabel: 'Submitting',
        successTitle: 'SOUL claim submitted',
        successBody: 'Your proof-backed SOUL claim has been recorded.',
        error: 'We couldn\'t load this page.',
        claimError: 'Claim failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: '검증된 신뢰에서 SOUL을 청구합니다.',
        eyebrow: '증빙 기반 SOUL 청구',
        description: '이 초기 흐름은 증빙 기반 청구를 기록합니다. 최종 제품 흐름에서는 운영용 입력 대신 더 안전한 선택 단계로 바뀝니다.',
        typeLabel: 'SOUL 청구 유형',
        typeHelper: '이 신뢰 증빙에 맞는 운영용 청구 유형을 입력하세요.',
        typePlaceholder: '청구 유형 입력',
        payloadLabel: '운영용 청구 세부 정보',
        payloadHelper: '선택 사항 JSON 입력입니다. 아직 운영용 형식이므로 제공된 구조를 유지하세요.',
        payloadPlaceholder: '선택 사항 JSON 세부 정보',
        operationalNote: '세부 입력은 아직 운영용 형식이며, 최종 사용자 경험은 아닙니다.',
        submitLabel: 'SOUL 청구 기록',
        submittingLabel: '제출 중',
        successTitle: 'SOUL 청구가 제출되었습니다',
        successBody: '증빙 기반 SOUL 청구가 기록되었습니다.',
        error: '페이지를 불러오지 못했습니다.',
        claimError: '주장 제출에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getClaimCopy(locale: AppLocale): ClaimCopy {
    return CLAIM_COPY[locale];
}
