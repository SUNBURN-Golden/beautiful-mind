import {
    isStatusBlockerCode,
    STATUS_BLOCKER_CODES,
    type StatusBlockerCode,
} from './status-codes.ts';
import {
    ADMISSION_STAGES,
    type AdmissionStage,
} from './status-stages.ts';
import {
    isStatusDecisionReasonCode,
    STATUS_DECISION_REASON_CODES,
    type StatusDecisionReasonCode,
} from './status-reasons.ts';

export type StatusRecoveryAction = {
    href: string;
    label: string;
};

export type StatusStageCopy = {
    label: string;
    description: string;
    progressStep: number;
};

export type StatusBlockerCopy = {
    title: string;
    description: string;
    action?: StatusRecoveryAction;
};

const DEFAULT_STAGE_COPY: StatusStageCopy = {
    label: '상태 동기화 중',
    description: '현재 admission 상태를 동기화하고 있습니다.',
    progressStep: 5,
};

const STAGE_COPY_BY_CODE: Partial<Record<AdmissionStage, StatusStageCopy>> = {
    [ADMISSION_STAGES.AI_DECISION]: {
        label: 'AI 자동결정 진행 중',
        description: 'AI admission engine이 문서 판독과 규칙 검사를 수행하고 있습니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.RESUBMIT_REQUIRED]: {
        label: '문서 재제출 필요',
        description: '누락 또는 불명확한 문서가 있어 재제출이 필요합니다.',
        progressStep: 4,
    },
    [ADMISSION_STAGES.REJECTED]: {
        label: '심사 거절',
        description: '정책 기준 미충족으로 거절되었습니다. 필요하면 이의제기를 제출할 수 있습니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.EXCEPTION_REVIEW]: {
        label: '예외 검토 큐',
        description: '자동결정으로 확정하기 어려운 케이스가 예외 큐로 분기되었습니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.APPEAL_PENDING]: {
        label: '이의제기 처리 중',
        description: '이의제기 접수 건이 콜드패스에서 검토되고 있습니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.AUDIT_REVIEW]: {
        label: '감사 검토 중',
        description: '감사 표본 또는 신고 연계 검토가 진행 중입니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.APPROVED]: {
        label: '승인 완료 (SOUL 발급 대기)',
        description: '승인은 완료되었고 SOUL 자격증명 발급 후 ACTIVE로 전환됩니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.SOUL_ISSUED]: {
        label: 'SOUL 발급 완료',
        description: 'SOUL 발급이 완료되었습니다. ACTIVE 전환을 동기화 중입니다.',
        progressStep: 5,
    },
    [ADMISSION_STAGES.ACTIVE]: {
        label: '활성 사용자 상태',
        description: '핵심 기능 접근이 가능한 상태입니다.',
        progressStep: 5,
    },
};

const BLOCKER_COPY_BY_CODE: Record<StatusBlockerCode, StatusBlockerCopy> = {
    [STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED]: {
        title: 'Admission 시작 필요',
        description: '심사 신청이 아직 시작되지 않았습니다.',
        action: { href: '/apply', label: 'Admission 시작' },
    },
    [STATUS_BLOCKER_CODES.IDENTITY_REQUIRED]: {
        title: '신원 검증 필요',
        description: '신원 검증을 완료해야 다음 단계로 진행할 수 있습니다.',
        action: { href: '/apply/identity', label: '신원 검증 진행' },
    },
    [STATUS_BLOCKER_CODES.LIVENESS_REQUIRED]: {
        title: '실재 인물 검증 필요',
        description: '실재 인물 검증을 완료해야 문서 심사로 진행할 수 있습니다.',
        action: { href: '/apply/liveness', label: '실재 인물 검증 진행' },
    },
    [STATUS_BLOCKER_CODES.CONSENTS_REQUIRED]: {
        title: '분리 동의 제출 필요',
        description: '모든 동의 체크와 확인 문구 입력이 필요합니다.',
        action: { href: '/apply/consents', label: '동의 항목 제출' },
    },
    [STATUS_BLOCKER_CODES.DOCUMENTS_REQUIRED]: {
        title: '공식 문서 제출 필요',
        description: '필수 문서 4종의 제출/검증이 완료되지 않았습니다.',
        action: { href: '/apply/documents', label: '문서 제출' },
    },
    [STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED]: {
        title: '문서 재제출 필요',
        description: '판독 결과에 따라 일부 문서를 다시 제출해야 합니다.',
        action: { href: '/apply/documents', label: '문서 재제출' },
    },
    [STATUS_BLOCKER_CODES.ADMISSION_REJECTED]: {
        title: 'Admission 거절 상태',
        description: '거절 사유 확인 후 필요하면 이의제기를 제출할 수 있습니다.',
        action: { href: '/apply/appeal', label: '이의제기 제출' },
    },
    [STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED]: {
        title: '예외 검토 진행 중',
        description: '예외 큐 처리 중입니다. 상태 페이지에서 진행 상황을 확인하세요.',
        action: { href: '/apply/status', label: '예외 처리 상태 확인' },
    },
    [STATUS_BLOCKER_CODES.APPEAL_PENDING]: {
        title: '이의제기 처리 중',
        description: '이의제기가 접수되어 콜드패스 검토가 진행 중입니다.',
        action: { href: '/apply/status', label: '이의제기 상태 확인' },
    },
    [STATUS_BLOCKER_CODES.AUDIT_REVIEW_PENDING]: {
        title: '감사 검토 진행 중',
        description: '감사 또는 표본 검토가 진행 중입니다.',
        action: { href: '/apply/status', label: '감사 상태 확인' },
    },
    [STATUS_BLOCKER_CODES.AI_DECISION_PENDING]: {
        title: 'AI 자동결정 대기',
        description: 'AI 자동결정 결과가 반영될 때까지 상태 동기화를 진행합니다.',
        action: { href: '/apply/review', label: 'AI 자동결정 단계 보기' },
    },
    [STATUS_BLOCKER_CODES.SOUL_ISSUANCE_PENDING]: {
        title: 'SOUL 발급 대기',
        description: '승인 후 SOUL 자격증명 발급을 완료하는 중입니다.',
        action: { href: '/apply/status', label: 'SOUL 발급 상태 확인' },
    },
    [STATUS_BLOCKER_CODES.ACCOUNT_FROZEN]: {
        title: '계정 동결 상태',
        description: '계정이 동결되어 기능 접근이 제한됩니다.',
        action: { href: '/banned', label: '제한 안내 보기' },
    },
    [STATUS_BLOCKER_CODES.LEGACY_REVIEW_STAGE]: {
        title: '레거시 단계 정규화',
        description: '이전 심사 단계 코드가 현재 상태 모델로 정규화되었습니다.',
        action: { href: '/apply/status', label: '현재 상태 확인' },
    },
};

const DECISION_REASON_COPY_BY_CODE: Record<StatusDecisionReasonCode, string> = {
    [STATUS_DECISION_REASON_CODES.PRECONDITION_INCOMPLETE]: '선행 조건이 완료되지 않아 재제출이 필요합니다.',
    [STATUS_DECISION_REASON_CODES.MISSING_REQUIRED_DOCUMENTS]: '필수 문서가 누락되어 재제출이 필요합니다.',
    [STATUS_DECISION_REASON_CODES.DOCUMENT_REJECTED]: '문서 검증 거절로 심사가 종료되었습니다.',
    [STATUS_DECISION_REASON_CODES.DOCS_FLAGGED_FOR_RESUBMIT]: '문서 판독 결과 재제출이 요청되었습니다.',
    [STATUS_DECISION_REASON_CODES.AI_PROCESSING_INCOMPLETE]: 'AI 판독이 아직 완료되지 않아 재시도가 필요합니다.',
    [STATUS_DECISION_REASON_CODES.AI_HARD_REJECT_SIGNAL]: '위조/위험 신호가 감지되어 거절되었습니다.',
    [STATUS_DECISION_REASON_CODES.AI_CONFIDENCE_MISSING]: 'AI 신뢰도 정보가 부족해 예외 검토로 분기되었습니다.',
    [STATUS_DECISION_REASON_CODES.CROSS_DOCUMENT_CONFLICT]: '문서 간 상충 신호가 감지되어 예외 검토로 분기되었습니다.',
    [STATUS_DECISION_REASON_CODES.VERY_LOW_CONFIDENCE]: '신뢰도가 매우 낮아 거절되었습니다.',
    [STATUS_DECISION_REASON_CODES.LOW_CONFIDENCE_EXCEPTION]: '신뢰도가 낮아 예외 검토가 필요합니다.',
    [STATUS_DECISION_REASON_CODES.LOW_CONFIDENCE_RESUBMIT]: '신뢰도가 임계값 미만이라 재제출이 필요합니다.',
    [STATUS_DECISION_REASON_CODES.AI_RULES_APPROVED]: '정책 규칙을 충족해 승인되었습니다.',
};

const STATUS_ERROR_COPY_BY_CODE: Record<string, { title: string; message: string }> = {
    AUTH_REQUIRED: {
        title: '로그인이 필요합니다.',
        message: '세션이 만료되었거나 인증이 유효하지 않습니다. 다시 로그인해 주세요.',
    },
    BANNED: {
        title: '접근이 제한되었습니다.',
        message: '현재 계정은 제한 상태입니다. 지원 채널을 통해 확인해 주세요.',
    },
    STATUS_TIMEOUT: {
        title: '상태 조회 시간이 초과되었습니다.',
        message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    },
    INTERNAL_SERVER_ERROR: {
        title: '서버 상태 동기화 오류',
        message: '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    },
    STATUS_FETCH_FAILED: {
        title: '상태 동기화 실패',
        message: '상태 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.',
    },
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    GRADUATION_CERTIFICATE: '졸업증명서',
    INCOME_CERTIFICATE: '소득금액증명',
    MARRIAGE_CERTIFICATE: '혼인관계증명서',
    FAMILY_RELATION_CERTIFICATE: '가족관계증명서',
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
    IDENTITY_HANDLING: '신원정보 처리 동의',
    LIVENESS_HANDLING: '실재인물 검증 처리 동의',
    EDUCATION_DOCUMENT_HANDLING: '학력 문서 처리 동의',
    INCOME_DOCUMENT_HANDLING: '소득 문서 처리 동의',
    MARITAL_FAMILY_DOCUMENT_HANDLING: '혼인/가족 문서 처리 동의',
    AI_ASSISTED_ANALYSIS: 'AI 분석 동의',
    HUMAN_EXCEPTION_AUDIT_APPEAL_REVIEW: '예외/항소/감사 인간 검토 동의',
    IMMEDIATE_PURGE_AND_MINIMAL_RETENTION: '즉시 파기 및 최소보관 동의',
};

function fallbackCodeCopy(prefix: string, code: string): string {
    return `${prefix} (${code})`;
}

export function getStatusStageCopy(stage: AdmissionStage | string | null | undefined): StatusStageCopy {
    if (!stage) return DEFAULT_STAGE_COPY;
    const mapped = STAGE_COPY_BY_CODE[stage as AdmissionStage];
    if (mapped) return mapped;
    return {
        label: fallbackCodeCopy('상태 코드', stage),
        description: '상세 상태는 최신 동기화 정보와 권장 행동을 확인해 주세요.',
        progressStep: DEFAULT_STAGE_COPY.progressStep,
    };
}

export function getStatusBlockerCopy(code: string): StatusBlockerCopy {
    if (isStatusBlockerCode(code)) {
        return BLOCKER_COPY_BY_CODE[code];
    }
    return {
        title: fallbackCodeCopy('알 수 없는 blocker', code),
        description: '정의되지 않은 blocker 코드가 수신되었습니다. 상태 동기화를 다시 시도해 주세요.',
        action: { href: '/apply/status', label: '상태 페이지 확인' },
    };
}

export function getStatusRecoveryActions(blockers: string[]): StatusRecoveryAction[] {
    const dedup = new Map<string, StatusRecoveryAction>();
    for (const blockerCode of blockers) {
        const copy = getStatusBlockerCopy(blockerCode);
        if (!copy.action) continue;
        dedup.set(copy.action.href, copy.action);
    }
    return Array.from(dedup.values());
}

export function getStatusDecisionReasonCopy(reasonCode: string | null | undefined): string {
    if (!reasonCode) return '결정 사유 코드가 아직 확정되지 않았습니다.';
    if (isStatusDecisionReasonCode(reasonCode)) {
        return DECISION_REASON_COPY_BY_CODE[reasonCode];
    }
    return fallbackCodeCopy('정의되지 않은 결정 사유', reasonCode);
}

export function getStatusErrorCopy(errorCode: string | null | undefined): { title: string; message: string } {
    if (!errorCode) {
        return {
            title: '상태 동기화 오류',
            message: '상태 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
        };
    }
    return STATUS_ERROR_COPY_BY_CODE[errorCode] || {
        title: '상태 동기화 오류',
        message: fallbackCodeCopy('오류 코드', errorCode),
    };
}

export function formatDocumentTypeLabel(code: string): string {
    return DOCUMENT_TYPE_LABELS[code] || fallbackCodeCopy('문서 코드', code);
}

export function formatConsentTypeLabel(code: string): string {
    return CONSENT_TYPE_LABELS[code] || fallbackCodeCopy('동의 코드', code);
}

export function getKnownStatusBlockerCodes(): StatusBlockerCode[] {
    return Object.values(STATUS_BLOCKER_CODES);
}
