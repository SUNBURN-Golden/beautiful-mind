export const ADMISSION_STAGES = {
    LOGIN: 'LOGIN',
    APPLY_START: 'APPLY_START',
    IDENTITY: 'IDENTITY',
    LIVENESS: 'LIVENESS',
    CONSENTS: 'CONSENTS',
    DOCUMENTS: 'DOCUMENTS',
    AI_DECISION: 'AI_DECISION',
    RESUBMIT_REQUIRED: 'RESUBMIT_REQUIRED',
    REJECTED: 'REJECTED',
    EXCEPTION_REVIEW: 'EXCEPTION_REVIEW',
    APPEAL_PENDING: 'APPEAL_PENDING',
    AUDIT_REVIEW: 'AUDIT_REVIEW',
    APPROVED: 'APPROVED',
    SOUL_ISSUED: 'SOUL_ISSUED',
    ACTIVE: 'ACTIVE',
} as const;

export type AdmissionStage = (typeof ADMISSION_STAGES)[keyof typeof ADMISSION_STAGES];

export const LEGACY_ADMISSION_STAGE_CODES = {
    AI_REVIEW: 'AI_REVIEW',
    HUMAN_REVIEW: 'HUMAN_REVIEW',
} as const;

export type LegacyAdmissionStageCode =
    (typeof LEGACY_ADMISSION_STAGE_CODES)[keyof typeof LEGACY_ADMISSION_STAGE_CODES];

export const LEGACY_ADMISSION_STAGE_ALIASES: Record<LegacyAdmissionStageCode, AdmissionStage> = {
    [LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW]: ADMISSION_STAGES.AI_DECISION,
    [LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW]: ADMISSION_STAGES.EXCEPTION_REVIEW,
};

const ADMISSION_STAGE_SET = new Set<string>(Object.values(ADMISSION_STAGES));
const LEGACY_ADMISSION_STAGE_SET = new Set<string>(Object.values(LEGACY_ADMISSION_STAGE_CODES));

export function isAdmissionStage(value: string): value is AdmissionStage {
    return ADMISSION_STAGE_SET.has(value);
}

export function isLegacyAdmissionStageCode(value: string): value is LegacyAdmissionStageCode {
    return LEGACY_ADMISSION_STAGE_SET.has(value);
}

export function normalizeAdmissionStage(value: string | null | undefined): AdmissionStage | null {
    if (!value) return null;
    if (isAdmissionStage(value)) {
        return value;
    }
    if (isLegacyAdmissionStageCode(value)) {
        return LEGACY_ADMISSION_STAGE_ALIASES[value];
    }
    return null;
}
