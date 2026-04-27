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

export type StatusCopyLocale = 'en' | 'ko';
export type DisplayAudience = 'ordinary' | 'support' | 'diagnostic';

type StatusCopyOptions = {
    audience?: DisplayAudience;
};

type LocalizedText = Record<StatusCopyLocale, string>;

type LocalizedRecoveryAction = {
    href: string;
    label: LocalizedText;
};

type LocalizedStageCopy = {
    label: LocalizedText;
    description: LocalizedText;
    progressStep: number;
};

type LocalizedBlockerCopy = {
    title: LocalizedText;
    description: LocalizedText;
    action?: LocalizedRecoveryAction;
};

type LocalizedStatusErrorCopy = {
    title: LocalizedText;
    message: LocalizedText;
};

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

const SAFE_FALLBACKS = {
    additionalReviewRequired: {
        en: 'Additional review required',
        ko: '추가 검토 필요',
    },
    otherDocumentType: {
        en: 'Other document type',
        ko: '기타 문서 유형',
    },
    otherConsentRecord: {
        en: 'Other consent record',
        ko: '기타 동의 기록',
    },
    otherReviewState: {
        en: 'Other review state',
        ko: '기타 검토 상태',
    },
    otherAdmissionStatus: {
        en: 'Other admission status',
        ko: '기타 입장 상태',
    },
    otherStandingStatus: {
        en: 'Other standing status',
        ko: '기타 standing 상태',
    },
    otherTrustLevel: {
        en: 'Other trust level',
        ko: '기타 trust level',
    },
    otherAction: {
        en: 'Other action',
        ko: '기타 작업',
    },
    otherUnavailableReason: {
        en: 'Other unavailable reason',
        ko: '기타 제한 사유',
    },
    supportReferenceOnFile: {
        en: 'Support reference on file',
        ko: '지원 참조가 보관됨',
    },
    contractReferenceOnFile: {
        en: 'Contract reference on file',
        ko: '계약 참조가 보관됨',
    },
};

const RAW_FALLBACK_PREFIXES = {
    stage: { en: 'Status code', ko: '상태 코드' },
    blocker: { en: 'Unknown blocker', ko: '알 수 없는 blocker' },
    decisionReason: { en: 'Undefined decision reason', ko: '정의되지 않은 결정 사유' },
    error: { en: 'Error code', ko: '오류 코드' },
    documentType: { en: 'Document code', ko: '문서 코드' },
    consentType: { en: 'Consent code', ko: '동의 코드' },
    processingState: { en: 'Review state code', ko: '검토 상태 코드' },
    admissionStatus: { en: 'Admission status code', ko: '입장 상태 코드' },
    standingStatus: { en: 'Standing status code', ko: 'standing 상태 코드' },
    trustLevel: { en: 'Trust level code', ko: 'trust level 코드' },
    action: { en: 'Action code', ko: '작업 코드' },
    unavailableReason: { en: 'Unavailable reason code', ko: '제한 사유 코드' },
    supportReference: { en: 'Support reference', ko: '지원 참조' },
    contractIdentifier: { en: 'Contract reference', ko: '계약 참조' },
};

const DEFAULT_STAGE_COPY: LocalizedStageCopy = {
    label: {
        en: 'Status syncing',
        ko: '상태 동기화 중',
    },
    description: {
        en: 'Your current admission status is being synchronized.',
        ko: '현재 admission 상태를 동기화하고 있습니다.',
    },
    progressStep: 5,
};

const STAGE_COPY_BY_CODE: Partial<Record<AdmissionStage, LocalizedStageCopy>> = {
    [ADMISSION_STAGES.LOGIN]: {
        label: { en: 'Sign in required', ko: '로그인 필요' },
        description: {
            en: 'Sign in to continue the admission process.',
            ko: 'Admission 절차를 계속하려면 로그인해 주세요.',
        },
        progressStep: 0,
    },
    [ADMISSION_STAGES.APPLY_START]: {
        label: { en: 'Admission start required', ko: 'Admission 시작 필요' },
        description: {
            en: 'Start an admission record before continuing.',
            ko: '다음 단계로 진행하려면 admission 신청을 시작해야 합니다.',
        },
        progressStep: 0,
    },
    [ADMISSION_STAGES.IDENTITY]: {
        label: { en: 'Identity verification required', ko: '신원 검증 필요' },
        description: {
            en: 'Complete identity verification to continue.',
            ko: '다음 단계로 진행하려면 신원 검증을 완료해야 합니다.',
        },
        progressStep: 1,
    },
    [ADMISSION_STAGES.LIVENESS]: {
        label: { en: 'Liveness verification required', ko: '실재 인물 검증 필요' },
        description: {
            en: 'Complete liveness verification to continue.',
            ko: '다음 단계로 진행하려면 실재 인물 검증을 완료해야 합니다.',
        },
        progressStep: 2,
    },
    [ADMISSION_STAGES.CONSENTS]: {
        label: { en: 'Consent confirmation required', ko: '동의 확인 필요' },
        description: {
            en: 'Review and confirm the required consent records.',
            ko: '필수 동의 항목을 확인하고 제출해야 합니다.',
        },
        progressStep: 3,
    },
    [ADMISSION_STAGES.DOCUMENTS]: {
        label: { en: 'Document submission required', ko: '문서 제출 필요' },
        description: {
            en: 'Submit the required official documents.',
            ko: '필수 공식 문서를 제출해야 합니다.',
        },
        progressStep: 4,
    },
    [ADMISSION_STAGES.AI_DECISION]: {
        label: { en: 'AI decision in progress', ko: 'AI 자동결정 진행 중' },
        description: {
            en: 'The AI admission engine is reading documents and checking policy rules.',
            ko: 'AI admission engine이 문서 판독과 규칙 검사를 수행하고 있습니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.RESUBMIT_REQUIRED]: {
        label: { en: 'Document resubmission required', ko: '문서 재제출 필요' },
        description: {
            en: 'Some required documents are missing or unclear and need resubmission.',
            ko: '누락 또는 불명확한 문서가 있어 재제출이 필요합니다.',
        },
        progressStep: 4,
    },
    [ADMISSION_STAGES.REJECTED]: {
        label: { en: 'Admission rejected', ko: '심사 거절' },
        description: {
            en: 'The record did not meet policy requirements. You may submit an appeal if needed.',
            ko: '정책 기준 미충족으로 거절되었습니다. 필요하면 이의제기를 제출할 수 있습니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.EXCEPTION_REVIEW]: {
        label: { en: 'Exception review queue', ko: '예외 검토 큐' },
        description: {
            en: 'This case moved to an exception queue because it cannot be finalized automatically.',
            ko: '자동결정으로 확정하기 어려운 케이스가 예외 큐로 분기되었습니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.APPEAL_PENDING]: {
        label: { en: 'Appeal under review', ko: '이의제기 처리 중' },
        description: {
            en: 'A submitted appeal is being reviewed through the cold path.',
            ko: '이의제기 접수 건이 콜드패스에서 검토되고 있습니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.AUDIT_REVIEW]: {
        label: { en: 'Audit review in progress', ko: '감사 검토 중' },
        description: {
            en: 'A sample audit or report-linked review is in progress.',
            ko: '감사 표본 또는 신고 연계 검토가 진행 중입니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.APPROVED]: {
        label: { en: 'Approved, SOUL pending', ko: '승인 완료 (SOUL 발급 대기)' },
        description: {
            en: 'Admission is approved and will become ACTIVE after SOUL credential issuance.',
            ko: '승인은 완료되었고 SOUL 자격증명 발급 후 ACTIVE로 전환됩니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.SOUL_ISSUED]: {
        label: { en: 'SOUL issued', ko: 'SOUL 발급 완료' },
        description: {
            en: 'SOUL issuance is complete. ACTIVE status is being synchronized.',
            ko: 'SOUL 발급이 완료되었습니다. ACTIVE 전환을 동기화 중입니다.',
        },
        progressStep: 5,
    },
    [ADMISSION_STAGES.ACTIVE]: {
        label: { en: 'Active user status', ko: '활성 사용자 상태' },
        description: {
            en: 'Core feature access is available.',
            ko: '핵심 기능 접근이 가능한 상태입니다.',
        },
        progressStep: 5,
    },
};

const BLOCKER_COPY_BY_CODE: Record<StatusBlockerCode, LocalizedBlockerCopy> = {
    [STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED]: {
        title: { en: 'Admission start required', ko: 'Admission 시작 필요' },
        description: {
            en: 'The review application has not been started yet.',
            ko: '심사 신청이 아직 시작되지 않았습니다.',
        },
        action: { href: '/apply', label: { en: 'Start admission', ko: 'Admission 시작' } },
    },
    [STATUS_BLOCKER_CODES.IDENTITY_REQUIRED]: {
        title: { en: 'Identity verification required', ko: '신원 검증 필요' },
        description: {
            en: 'Identity verification must be completed before continuing.',
            ko: '신원 검증을 완료해야 다음 단계로 진행할 수 있습니다.',
        },
        action: { href: '/apply/identity', label: { en: 'Verify identity', ko: '신원 검증 진행' } },
    },
    [STATUS_BLOCKER_CODES.LIVENESS_REQUIRED]: {
        title: { en: 'Liveness verification required', ko: '실재 인물 검증 필요' },
        description: {
            en: 'Liveness verification must be completed before document review.',
            ko: '실재 인물 검증을 완료해야 문서 심사로 진행할 수 있습니다.',
        },
        action: { href: '/apply/liveness', label: { en: 'Verify liveness', ko: '실재 인물 검증 진행' } },
    },
    [STATUS_BLOCKER_CODES.CONSENTS_REQUIRED]: {
        title: { en: 'Consent submission required', ko: '분리 동의 제출 필요' },
        description: {
            en: 'All consent checks and acknowledgment phrases are required.',
            ko: '모든 동의 체크와 확인 문구 입력이 필요합니다.',
        },
        action: { href: '/apply/consents', label: { en: 'Submit consents', ko: '동의 항목 제출' } },
    },
    [STATUS_BLOCKER_CODES.DOCUMENTS_REQUIRED]: {
        title: { en: 'Official documents required', ko: '공식 문서 제출 필요' },
        description: {
            en: 'The four required official documents are not fully submitted and verified.',
            ko: '필수 문서 4종의 제출/검증이 완료되지 않았습니다.',
        },
        action: { href: '/apply/documents', label: { en: 'Submit documents', ko: '문서 제출' } },
    },
    [STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED]: {
        title: { en: 'Document resubmission required', ko: '문서 재제출 필요' },
        description: {
            en: 'Some documents need to be submitted again based on review results.',
            ko: '판독 결과에 따라 일부 문서를 다시 제출해야 합니다.',
        },
        action: { href: '/apply/documents', label: { en: 'Resubmit documents', ko: '문서 재제출' } },
    },
    [STATUS_BLOCKER_CODES.ADMISSION_REJECTED]: {
        title: { en: 'Admission rejected', ko: 'Admission 거절 상태' },
        description: {
            en: 'Review the reason and submit an appeal if needed.',
            ko: '거절 사유 확인 후 필요하면 이의제기를 제출할 수 있습니다.',
        },
        action: { href: '/apply/appeal', label: { en: 'Submit appeal', ko: '이의제기 제출' } },
    },
    [STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED]: {
        title: { en: 'Exception review in progress', ko: '예외 검토 진행 중' },
        description: {
            en: 'The exception queue is processing this case. Check the status page for progress.',
            ko: '예외 큐 처리 중입니다. 상태 페이지에서 진행 상황을 확인하세요.',
        },
        action: { href: '/apply/status', label: { en: 'Check exception status', ko: '예외 처리 상태 확인' } },
    },
    [STATUS_BLOCKER_CODES.APPEAL_PENDING]: {
        title: { en: 'Appeal under review', ko: '이의제기 처리 중' },
        description: {
            en: 'Your appeal was received and is under cold-path review.',
            ko: '이의제기가 접수되어 콜드패스 검토가 진행 중입니다.',
        },
        action: { href: '/apply/status', label: { en: 'Check appeal status', ko: '이의제기 상태 확인' } },
    },
    [STATUS_BLOCKER_CODES.AUDIT_REVIEW_PENDING]: {
        title: { en: 'Audit review in progress', ko: '감사 검토 진행 중' },
        description: {
            en: 'An audit or sample review is in progress.',
            ko: '감사 또는 표본 검토가 진행 중입니다.',
        },
        action: { href: '/apply/status', label: { en: 'Check audit status', ko: '감사 상태 확인' } },
    },
    [STATUS_BLOCKER_CODES.AI_DECISION_PENDING]: {
        title: { en: 'AI decision pending', ko: 'AI 자동결정 대기' },
        description: {
            en: 'Status will sync after the AI decision result is recorded.',
            ko: 'AI 자동결정 결과가 반영될 때까지 상태 동기화를 진행합니다.',
        },
        action: { href: '/apply/review', label: { en: 'View AI decision step', ko: 'AI 자동결정 단계 보기' } },
    },
    [STATUS_BLOCKER_CODES.SOUL_ISSUANCE_PENDING]: {
        title: { en: 'SOUL issuance pending', ko: 'SOUL 발급 대기' },
        description: {
            en: 'SOUL credential issuance is being completed after approval.',
            ko: '승인 후 SOUL 자격증명 발급을 완료하는 중입니다.',
        },
        action: { href: '/apply/status', label: { en: 'Check SOUL issuance status', ko: 'SOUL 발급 상태 확인' } },
    },
    [STATUS_BLOCKER_CODES.ACCOUNT_FROZEN]: {
        title: { en: 'Account frozen', ko: '계정 동결 상태' },
        description: {
            en: 'Feature access is restricted while the account is frozen.',
            ko: '계정이 동결되어 기능 접근이 제한됩니다.',
        },
        action: { href: '/banned', label: { en: 'View restriction notice', ko: '제한 안내 보기' } },
    },
    [STATUS_BLOCKER_CODES.LEGACY_REVIEW_STAGE]: {
        title: { en: 'Legacy stage normalized', ko: '레거시 단계 정규화' },
        description: {
            en: 'An older review-stage code was normalized to the current status model.',
            ko: '이전 심사 단계 코드가 현재 상태 모델로 정규화되었습니다.',
        },
        action: { href: '/apply/status', label: { en: 'Check current status', ko: '현재 상태 확인' } },
    },
};

const DECISION_REASON_COPY_BY_CODE: Record<StatusDecisionReasonCode, LocalizedText> = {
    [STATUS_DECISION_REASON_CODES.PRECONDITION_INCOMPLETE]: {
        en: 'A required precondition is incomplete, so resubmission is needed.',
        ko: '선행 조건이 완료되지 않아 재제출이 필요합니다.',
    },
    [STATUS_DECISION_REASON_CODES.MISSING_REQUIRED_DOCUMENTS]: {
        en: 'Required documents are missing, so resubmission is needed.',
        ko: '필수 문서가 누락되어 재제출이 필요합니다.',
    },
    [STATUS_DECISION_REASON_CODES.DOCUMENT_REJECTED]: {
        en: 'The review ended because document verification was rejected.',
        ko: '문서 검증 거절로 심사가 종료되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.DOCS_FLAGGED_FOR_RESUBMIT]: {
        en: 'Document reading results requested resubmission.',
        ko: '문서 판독 결과 재제출이 요청되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.AI_PROCESSING_INCOMPLETE]: {
        en: 'AI reading is not complete yet, so the decision needs another attempt.',
        ko: 'AI 판독이 아직 완료되지 않아 재시도가 필요합니다.',
    },
    [STATUS_DECISION_REASON_CODES.AI_HARD_REJECT_SIGNAL]: {
        en: 'A fraud or risk signal was detected, so the record was rejected.',
        ko: '위조/위험 신호가 감지되어 거절되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.AI_CONFIDENCE_MISSING]: {
        en: 'AI confidence information was insufficient, so this moved to exception review.',
        ko: 'AI 신뢰도 정보가 부족해 예외 검토로 분기되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.CROSS_DOCUMENT_CONFLICT]: {
        en: 'Conflicting signals were detected across documents, so this moved to exception review.',
        ko: '문서 간 상충 신호가 감지되어 예외 검토로 분기되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.VERY_LOW_CONFIDENCE]: {
        en: 'The record was rejected because confidence was very low.',
        ko: '신뢰도가 매우 낮아 거절되었습니다.',
    },
    [STATUS_DECISION_REASON_CODES.LOW_CONFIDENCE_EXCEPTION]: {
        en: 'Confidence was low, so exception review is required.',
        ko: '신뢰도가 낮아 예외 검토가 필요합니다.',
    },
    [STATUS_DECISION_REASON_CODES.LOW_CONFIDENCE_RESUBMIT]: {
        en: 'Confidence was below the threshold, so resubmission is required.',
        ko: '신뢰도가 임계값 미만이라 재제출이 필요합니다.',
    },
    [STATUS_DECISION_REASON_CODES.AI_RULES_APPROVED]: {
        en: 'Policy rules were satisfied and the record was approved.',
        ko: '정책 규칙을 충족해 승인되었습니다.',
    },
};

const STATUS_ERROR_COPY_BY_CODE: Record<string, LocalizedStatusErrorCopy> = {
    AUTH_REQUIRED: {
        title: { en: 'Sign in required.', ko: '로그인이 필요합니다.' },
        message: {
            en: 'Your session expired or authentication is no longer valid. Please sign in again.',
            ko: '세션이 만료되었거나 인증이 유효하지 않습니다. 다시 로그인해 주세요.',
        },
    },
    BANNED: {
        title: { en: 'Access is restricted.', ko: '접근이 제한되었습니다.' },
        message: {
            en: 'This account is currently restricted. Please confirm through support.',
            ko: '현재 계정은 제한 상태입니다. 지원 채널을 통해 확인해 주세요.',
        },
    },
    STATUS_TIMEOUT: {
        title: { en: 'Status lookup timed out.', ko: '상태 조회 시간이 초과되었습니다.' },
        message: {
            en: 'Check your network status and try again.',
            ko: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
        },
    },
    INTERNAL_SERVER_ERROR: {
        title: { en: 'Status sync error', ko: '서버 상태 동기화 오류' },
        message: {
            en: 'A temporary server error occurred. Please try again shortly.',
            ko: '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        },
    },
    STATUS_FETCH_FAILED: {
        title: { en: 'Status sync failed', ko: '상태 동기화 실패' },
        message: {
            en: 'Status information could not be loaded. Refresh and try again.',
            ko: '상태 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.',
        },
    },
};

const DOCUMENT_TYPE_LABELS: Record<string, LocalizedText> = {
    GRADUATION_CERTIFICATE: { en: 'Graduation certificate', ko: '졸업증명서' },
    INCOME_CERTIFICATE: { en: 'Income certificate', ko: '소득금액증명' },
    MARRIAGE_CERTIFICATE: { en: 'Marriage certificate', ko: '혼인관계증명서' },
    FAMILY_RELATION_CERTIFICATE: { en: 'Family relation certificate', ko: '가족관계증명서' },
};

const CONSENT_TYPE_LABELS: Record<string, LocalizedText> = {
    IDENTITY_HANDLING: { en: 'Identity handling consent', ko: '신원정보 처리 동의' },
    LIVENESS_HANDLING: { en: 'Liveness verification handling consent', ko: '실재인물 검증 처리 동의' },
    EDUCATION_DOCUMENT_HANDLING: { en: 'Education document handling consent', ko: '학력 문서 처리 동의' },
    INCOME_DOCUMENT_HANDLING: { en: 'Income document handling consent', ko: '소득 문서 처리 동의' },
    MARITAL_FAMILY_DOCUMENT_HANDLING: { en: 'Marital/family document handling consent', ko: '혼인/가족 문서 처리 동의' },
    AI_ASSISTED_ANALYSIS: { en: 'AI analysis consent', ko: 'AI 분석 동의' },
    HUMAN_EXCEPTION_AUDIT_APPEAL_REVIEW: {
        en: 'Human exception/audit/appeal review consent',
        ko: '예외/항소/감사 인간 검토 동의',
    },
    IMMEDIATE_PURGE_AND_MINIMAL_RETENTION: {
        en: 'Immediate purge and minimal retention consent',
        ko: '즉시 파기 및 최소보관 동의',
    },
};

const PROCESSING_STATE_LABELS: Record<string, LocalizedText> = {
    AI_PASSED: { en: 'AI review passed', ko: 'AI 검토 통과' },
    AI_FLAGGED: { en: 'AI review flagged', ko: 'AI 검토 플래그' },
    AI_REJECTED: { en: 'AI review rejected', ko: 'AI 검토 거절' },
    VERIFIED: { en: 'Verified', ko: '검증 완료' },
    ACTIVE: { en: 'Active', ko: '활성' },
    ADMISSION_VERIFIED: { en: 'Admission verified', ko: '입장 검증 완료' },
    PENDING: { en: 'Pending', ko: '대기 중' },
    UPLOADED: { en: 'Uploaded', ko: '업로드 완료' },
    REPLACED: { en: 'Replaced', ko: '교체됨' },
    REJECTED: { en: 'Rejected', ko: '거절됨' },
    RESUBMIT_REQUIRED: { en: 'Resubmission required', ko: '재제출 필요' },
};

const ADMISSION_STATUS_LABELS: Record<string, LocalizedText> = {
    ACTIVE: { en: 'Active', ko: '활성' },
    ADMISSION_VERIFIED: { en: 'Admission verified', ko: '입장 검증 완료' },
    PENDING: { en: 'Pending admission', ko: '입장 대기' },
    APPROVED: { en: 'Approved', ko: '승인됨' },
    REJECTED: { en: 'Rejected', ko: '거절됨' },
    RESUBMIT_REQUIRED: { en: 'Resubmission required', ko: '재제출 필요' },
    EXCEPTION_REVIEW: { en: 'Exception review', ko: '예외 검토' },
    APPEAL_PENDING: { en: 'Appeal under review', ko: '이의제기 검토 중' },
    AUDIT_REVIEW: { en: 'Audit review', ko: '감사 검토' },
    SOUL_ISSUED: { en: 'SOUL issued', ko: 'SOUL 발급 완료' },
    AI_DECISION: { en: 'AI decision', ko: 'AI 자동결정' },
    FROZEN: { en: 'Frozen', ko: '동결됨' },
};

const STANDING_STATUS_LABELS: Record<string, LocalizedText> = {
    ACTIVE: { en: 'Active standing', ko: '활성 standing' },
    ADMISSION_VERIFIED: { en: 'Admission verified standing', ko: '입장 검증 standing' },
    PENDING: { en: 'Standing pending', ko: 'standing 대기' },
    FROZEN: { en: 'Standing frozen', ko: 'standing 동결' },
    REVOKED: { en: 'Standing revoked', ko: 'standing 취소' },
    INACTIVE: { en: 'Standing inactive', ko: 'standing 비활성' },
};

const TRUST_LEVEL_LABELS: Record<string, LocalizedText> = {
    ACTIVE: { en: 'Active trust', ko: '활성 trust' },
    ADMISSION_VERIFIED: { en: 'Admission verified', ko: '입장 검증 완료' },
    VERIFIED: { en: 'Verified', ko: '검증 완료' },
    HIGH: { en: 'High trust', ko: '높은 trust' },
    MEDIUM: { en: 'Medium trust', ko: '중간 trust' },
    LOW: { en: 'Low trust', ko: '낮은 trust' },
    PENDING: { en: 'Trust pending', ko: 'trust 대기' },
};

const ACTION_LABELS: Record<string, LocalizedText> = {
    SIGN_OUT: { en: 'Sign out', ko: '로그아웃' },
    CLOSE_SESSION: { en: 'Close this session', ko: '세션 닫기' },
    CONTINUE: { en: 'Continue', ko: '계속' },
    REVIEW: { en: 'Review', ko: '검토' },
    SUBMIT: { en: 'Submit', ko: '제출' },
    START_ADMISSION: { en: 'Start admission', ko: 'Admission 시작' },
    VIEW_STATUS: { en: 'View current status', ko: '현재 상태 보기' },
    OPEN_APPEAL: { en: 'Open appeal', ko: '이의제기 열기' },
    UPLOAD_DOCUMENTS: { en: 'Upload documents', ko: '문서 업로드' },
    VIEW_SUPPORT_REFERENCE: { en: 'View support reference', ko: '지원 참조 보기' },
};

const UNAVAILABLE_REASON_LABELS: Record<string, LocalizedText> = {
    AUTH_REQUIRED: { en: 'Sign in required', ko: '로그인 필요' },
    ACCOUNT_FROZEN: { en: 'Account frozen', ko: '계정 동결' },
    NOT_ACTIVE: { en: 'Active standing required', ko: '활성 standing 필요' },
    REVIEW_PENDING: { en: 'Review in progress', ko: '검토 진행 중' },
};

const SUPPORT_REFERENCE_LABELS: Record<string, LocalizedText> = {
    REFERENCE_CODE: { en: 'Support reference', ko: '지원 참조' },
    STATUS_REFERENCE: { en: 'Status reference', ko: '상태 참조' },
    EVIDENCE_REFERENCE: { en: 'Evidence reference', ko: '증거 참조' },
};

const CONTRACT_IDENTIFIER_LABELS: Record<string, LocalizedText> = {
    'identity.active': { en: 'Identity verification record', ko: '신원 검증 기록' },
    'documents.4.verified': { en: 'Required documents verified', ko: '필수 문서 검증 기록' },
    'consent.recorded': { en: 'Consent record', ko: '동의 기록' },
    'credential.active': { en: 'Active credential record', ko: '활성 자격증명 기록' },
    'dashboard.access-board.v1': { en: 'Access board record', ko: 'Access board 기록' },
    'stage5.landing.invitation.v1': { en: 'Landing invitation record', ko: 'Landing invitation 기록' },
    'standing-active': { en: 'Active standing record', ko: '활성 standing 기록' },
    'standing:active:admission-verified:active': {
        en: 'Active admission standing record',
        ko: '활성 입장 standing 기록',
    },
};

export function normalizeStatusCopyLocale(locale?: string): StatusCopyLocale {
    return locale === 'en' ? 'en' : 'ko';
}

function isOrdinaryAudience(options?: StatusCopyOptions): boolean {
    return (options?.audience || 'ordinary') === 'ordinary';
}

function localizeText(text: LocalizedText, locale: StatusCopyLocale): string {
    return text[locale];
}

function fallbackCodeCopy(prefix: string, code: string): string {
    return `${prefix} (${code})`;
}

function localizedRawFallback(prefix: LocalizedText, code: string, locale: StatusCopyLocale): string {
    return fallbackCodeCopy(prefix[locale], code);
}

function toStatusStageCopy(copy: LocalizedStageCopy, locale: StatusCopyLocale): StatusStageCopy {
    return {
        label: copy.label[locale],
        description: copy.description[locale],
        progressStep: copy.progressStep,
    };
}

function toStatusBlockerCopy(copy: LocalizedBlockerCopy, locale: StatusCopyLocale): StatusBlockerCopy {
    return {
        title: copy.title[locale],
        description: copy.description[locale],
        action: copy.action
            ? { href: copy.action.href, label: copy.action.label[locale] }
            : undefined,
    };
}

function formatMappedLabel({
    code,
    locale,
    options,
    map,
    ordinaryFallback,
    rawFallbackPrefix,
}: {
    code: string | null | undefined;
    locale: StatusCopyLocale;
    options?: StatusCopyOptions;
    map: Record<string, LocalizedText>;
    ordinaryFallback: LocalizedText;
    rawFallbackPrefix: LocalizedText;
}): string {
    if (code && map[code]) {
        return map[code][locale];
    }
    if (isOrdinaryAudience(options)) {
        return ordinaryFallback[locale];
    }
    return localizedRawFallback(rawFallbackPrefix, code || 'UNKNOWN', locale);
}

export function getStatusStageCopyForLocale(
    stage: AdmissionStage | string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): StatusStageCopy {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (!stage) return toStatusStageCopy(DEFAULT_STAGE_COPY, normalizedLocale);
    const mapped = STAGE_COPY_BY_CODE[stage as AdmissionStage];
    if (mapped) return toStatusStageCopy(mapped, normalizedLocale);
    if (isOrdinaryAudience(options)) {
        return {
            label: SAFE_FALLBACKS.additionalReviewRequired[normalizedLocale],
            description: {
                en: 'This status needs review through the current status page.',
                ko: '이 상태는 현재 상태 페이지에서 추가 확인이 필요합니다.',
            }[normalizedLocale],
            progressStep: DEFAULT_STAGE_COPY.progressStep,
        };
    }
    return {
        label: localizedRawFallback(RAW_FALLBACK_PREFIXES.stage, stage, normalizedLocale),
        description: {
            en: 'Review the latest synchronized status and recommended action.',
            ko: '상세 상태는 최신 동기화 정보와 권장 행동을 확인해 주세요.',
        }[normalizedLocale],
        progressStep: DEFAULT_STAGE_COPY.progressStep,
    };
}

export function getStatusBlockerCopyForLocale(
    code: string,
    locale?: string,
    options?: StatusCopyOptions,
): StatusBlockerCopy {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isStatusBlockerCode(code)) {
        return toStatusBlockerCopy(BLOCKER_COPY_BY_CODE[code], normalizedLocale);
    }
    if (isOrdinaryAudience(options)) {
        return {
            title: SAFE_FALLBACKS.additionalReviewRequired[normalizedLocale],
            description: {
                en: 'This record needs additional review before the next action is available.',
                ko: '다음 작업을 제공하기 전에 이 기록은 추가 검토가 필요합니다.',
            }[normalizedLocale],
            action: { href: '/apply/status', label: { en: 'Check current status', ko: '현재 상태 확인' }[normalizedLocale] },
        };
    }
    return {
        title: localizedRawFallback(RAW_FALLBACK_PREFIXES.blocker, code, normalizedLocale),
        description: {
            en: 'An unmapped blocker code was received. Try syncing status again.',
            ko: '정의되지 않은 blocker 코드가 수신되었습니다. 상태 동기화를 다시 시도해 주세요.',
        }[normalizedLocale],
        action: { href: '/apply/status', label: { en: 'Check status page', ko: '상태 페이지 확인' }[normalizedLocale] },
    };
}

export function getStatusRecoveryActionsForLocale(
    blockers: string[],
    locale?: string,
    options?: StatusCopyOptions,
): StatusRecoveryAction[] {
    const dedup = new Map<string, StatusRecoveryAction>();
    for (const blockerCode of blockers) {
        const copy = getStatusBlockerCopyForLocale(blockerCode, locale, options);
        if (!copy.action) continue;
        dedup.set(copy.action.href, copy.action);
    }
    return Array.from(dedup.values());
}

export function getStatusDecisionReasonCopyForLocale(
    reasonCode: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (reasonCode && isStatusDecisionReasonCode(reasonCode)) {
        return DECISION_REASON_COPY_BY_CODE[reasonCode][normalizedLocale];
    }
    if (isOrdinaryAudience(options)) {
        return SAFE_FALLBACKS.additionalReviewRequired[normalizedLocale];
    }
    return localizedRawFallback(RAW_FALLBACK_PREFIXES.decisionReason, reasonCode || 'UNKNOWN', normalizedLocale);
}

export function getStatusErrorCopyForLocale(
    errorCode: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): { title: string; message: string } {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    const mapped = errorCode ? STATUS_ERROR_COPY_BY_CODE[errorCode] : null;
    if (mapped) {
        return {
            title: mapped.title[normalizedLocale],
            message: mapped.message[normalizedLocale],
        };
    }
    if (isOrdinaryAudience(options)) {
        return {
            title: { en: 'Status sync issue', ko: '상태 동기화 오류' }[normalizedLocale],
            message: {
                en: 'This status message needs support review. Try again or contact support.',
                ko: '이 상태 메시지는 지원 확인이 필요합니다. 다시 시도하거나 지원 채널에 문의해 주세요.',
            }[normalizedLocale],
        };
    }
    return {
        title: { en: 'Status sync issue', ko: '상태 동기화 오류' }[normalizedLocale],
        message: localizedRawFallback(RAW_FALLBACK_PREFIXES.error, errorCode || 'UNKNOWN', normalizedLocale),
    };
}

export function formatDocumentTypeLabelForLocale(
    code: string,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: DOCUMENT_TYPE_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherDocumentType,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.documentType,
    });
}

export function formatConsentTypeLabelForLocale(
    code: string,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: CONSENT_TYPE_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherConsentRecord,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.consentType,
    });
}

export function formatProcessingStateLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: PROCESSING_STATE_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherReviewState,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.processingState,
    });
}

export function formatAdmissionStatusLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: ADMISSION_STATUS_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherAdmissionStatus,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.admissionStatus,
    });
}

export function formatStandingStatusLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: STANDING_STATUS_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherStandingStatus,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.standingStatus,
    });
}

export function formatTrustLevelLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: TRUST_LEVEL_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherTrustLevel,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.trustLevel,
    });
}

export function formatActionLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: ACTION_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherAction,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.action,
    });
}

export function formatUnavailableReasonLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: UNAVAILABLE_REASON_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.otherUnavailableReason,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.unavailableReason,
    });
}

export function formatSupportReferenceLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: SUPPORT_REFERENCE_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.supportReferenceOnFile,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.supportReference,
    });
}

export function formatContractIdentifierLabel(
    code: string | null | undefined,
    locale?: string,
    options?: StatusCopyOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    return formatMappedLabel({
        code,
        locale: normalizedLocale,
        options,
        map: CONTRACT_IDENTIFIER_LABELS,
        ordinaryFallback: SAFE_FALLBACKS.contractReferenceOnFile,
        rawFallbackPrefix: RAW_FALLBACK_PREFIXES.contractIdentifier,
    });
}

export function getStatusStageCopy(stage: AdmissionStage | string | null | undefined): StatusStageCopy {
    if (!stage) return toStatusStageCopy(DEFAULT_STAGE_COPY, 'ko');
    const mapped = STAGE_COPY_BY_CODE[stage as AdmissionStage];
    if (mapped) return toStatusStageCopy(mapped, 'ko');
    return {
        label: fallbackCodeCopy('상태 코드', stage),
        description: '상세 상태는 최신 동기화 정보와 권장 행동을 확인해 주세요.',
        progressStep: DEFAULT_STAGE_COPY.progressStep,
    };
}

export function getStatusBlockerCopy(code: string): StatusBlockerCopy {
    if (isStatusBlockerCode(code)) {
        return toStatusBlockerCopy(BLOCKER_COPY_BY_CODE[code], 'ko');
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
        return DECISION_REASON_COPY_BY_CODE[reasonCode].ko;
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
    const mapped = STATUS_ERROR_COPY_BY_CODE[errorCode];
    if (mapped) {
        return { title: mapped.title.ko, message: mapped.message.ko };
    }
    return {
        title: '상태 동기화 오류',
        message: fallbackCodeCopy('오류 코드', errorCode),
    };
}

export function formatDocumentTypeLabel(code: string): string {
    return formatDocumentTypeLabelForLocale(code, 'ko', { audience: 'support' });
}

export function formatConsentTypeLabel(code: string): string {
    return formatConsentTypeLabelForLocale(code, 'ko', { audience: 'support' });
}

export function getKnownStatusBlockerCodes(): StatusBlockerCode[] {
    return Object.values(STATUS_BLOCKER_CODES);
}
