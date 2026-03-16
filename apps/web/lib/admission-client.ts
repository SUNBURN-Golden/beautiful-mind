import { z } from 'zod';
import {
    IdentitySessionCompleteResponseSchema,
    IdentitySessionStartResponseSchema,
    type IdentitySessionCompleteResponse,
    type IdentitySessionStartResponse,
} from './contracts/admission-identity-contract.ts';
import {
    LivenessSessionCompleteResponseSchema,
    LivenessSessionResultResponseSchema,
    LivenessSessionStartResponseSchema,
    type LivenessSessionCompleteResponse,
    type LivenessSessionResultResponse,
    type LivenessSessionStartResponse,
} from './contracts/admission-liveness-contract.ts';

export const ADMISSION_DOCUMENTS = [
    {
        type: 'GRADUATION_CERTIFICATE',
        title: '졸업증명서',
        description: '학교명/졸업 여부만 최소 클레임으로 유지됩니다.',
    },
    {
        type: 'INCOME_CERTIFICATE',
        title: '소득금액증명',
        description: '소득 연도/소득 구간만 최소 클레임으로 유지됩니다.',
    },
    {
        type: 'MARRIAGE_CERTIFICATE',
        title: '혼인관계증명서',
        description: '혼인 상태/이혼 여부 플래그만 최소 클레임으로 유지됩니다.',
    },
    {
        type: 'FAMILY_RELATION_CERTIFICATE',
        title: '가족관계증명서(자녀 확인용)',
        description: '자녀 유무 및 수량 밴드만 최소 클레임으로 유지됩니다.',
    },
] as const;

export const ADMISSION_CONSENTS = [
    {
        type: 'IDENTITY_HANDLING',
        label: '신원정보 처리 동의',
        phrase: 'I ACKNOWLEDGE IDENTITY HANDLING',
    },
    {
        type: 'LIVENESS_HANDLING',
        label: '실재인물 검증 처리 동의',
        phrase: 'I ACKNOWLEDGE LIVENESS HANDLING',
    },
    {
        type: 'EDUCATION_DOCUMENT_HANDLING',
        label: '학력 문서 처리 동의',
        phrase: 'I ACKNOWLEDGE EDUCATION DOCUMENT HANDLING',
    },
    {
        type: 'INCOME_DOCUMENT_HANDLING',
        label: '소득 문서 처리 동의',
        phrase: 'I ACKNOWLEDGE INCOME DOCUMENT HANDLING',
    },
    {
        type: 'MARITAL_FAMILY_DOCUMENT_HANDLING',
        label: '혼인/가족 문서 처리 동의',
        phrase: 'I ACKNOWLEDGE MARITAL FAMILY DOCUMENT HANDLING',
    },
    {
        type: 'AI_ASSISTED_ANALYSIS',
        label: 'AI 1차 분석 동의',
        phrase: 'I ACKNOWLEDGE AI ASSISTED ANALYSIS',
    },
    {
        type: 'HUMAN_EXCEPTION_AUDIT_APPEAL_REVIEW',
        label: '예외/항소/감사 인간 검토 동의',
        phrase: 'I ACKNOWLEDGE HUMAN EXCEPTION AUDIT APPEAL REVIEW',
    },
    {
        type: 'IMMEDIATE_PURGE_AND_MINIMAL_RETENTION',
        label: '즉시 파기 및 최소보관 동의',
        phrase: 'I ACKNOWLEDGE IMMEDIATE PURGE AND MINIMAL RETENTION',
    },
] as const;

export type AdmissionDocumentType = (typeof ADMISSION_DOCUMENTS)[number]['type'];
export type AdmissionConsentType = (typeof ADMISSION_CONSENTS)[number]['type'];

type ApiErrorPayload = {
    error?: string | { code?: string; message?: string };
    message?: string;
};

function toErrorCode(payload: unknown, fallback: string): string {
    if (!payload || typeof payload !== 'object') {
        return fallback;
    }

    const casted = payload as ApiErrorPayload;
    if (typeof casted.error === 'string' && casted.error.length > 0) {
        return casted.error;
    }
    if (casted.error && typeof casted.error === 'object') {
        const nestedMessage = casted.error.message;
        if (typeof nestedMessage === 'string' && nestedMessage.length > 0) {
            return nestedMessage;
        }
        const nestedCode = casted.error.code;
        if (typeof nestedCode === 'string' && nestedCode.length > 0) {
            return nestedCode;
        }
    }
    if (typeof casted.message === 'string' && casted.message.length > 0) {
        return casted.message;
    }
    return fallback;
}

async function requestJson<T>({
    url,
    schema,
    init,
    fallbackError,
}: {
    url: string;
    schema: z.ZodType<T>;
    init?: RequestInit;
    fallbackError: string;
}): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(toErrorCode(payload, fallbackError));
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`${fallbackError}_CONTRACT_MISMATCH`);
    }
    return parsed.data;
}

async function requestFormData<T>({
    url,
    schema,
    formData,
    fallbackError,
}: {
    url: string;
    schema: z.ZodType<T>;
    formData: FormData;
    fallbackError: string;
}): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(toErrorCode(payload, fallbackError));
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`${fallbackError}_CONTRACT_MISMATCH`);
    }
    return parsed.data;
}

const StartAdmissionResponseSchema = z.object({
    success: z.boolean(),
    application_id: z.string(),
    status: z.string(),
    current_step: z.string(),
});

const IdentityVerifyResponseSchema = IdentitySessionCompleteResponseSchema;

const LivenessVerifyResponseSchema = z.object({
    success: z.boolean(),
    verified: z.boolean(),
    next_step: z.string(),
});

const ConsentSubmitResponseSchema = z.object({
    success: z.boolean(),
    policy_version: z.string(),
    next_step: z.string(),
});

const DocumentUploadResponseSchema = z.object({
    success: z.boolean(),
    submission: z.object({
        id: z.string(),
        document_type: z.string(),
        upload_status: z.string(),
        processing_status: z.string(),
        final_result: z.string(),
        uploaded_at: z.string(),
    }),
});

const DocumentSubmitResponseSchema = z.object({
    success: z.boolean(),
    next_step: z.string().optional(),
    all_documents_uploaded: z.boolean().optional(),
    ai_processing_pending: z.boolean().optional(),
    all_documents_ai_processed: z.boolean().optional(),
    auto_decision: z.string().optional(),
    reason_code: z.string().nullable().optional(),
    confidence_score: z.number().nullable().optional(),
    decision_run_id: z.string().nullable().optional(),
    application_status: z.string().optional(),
    soul_credential_id: z.string().nullable().optional(),
    resubmit_document_types: z.array(z.string()).optional(),
    exception_case_id: z.string().nullable().optional(),
    review_case_id: z.string().nullable().optional(),
    purged_count: z.number().optional(),
});

const AppealCreateResponseSchema = z.object({
    success: z.boolean(),
    appeal_id: z.string(),
    review_case_id: z.string().nullable().optional(),
    source_decision_run_id: z.string().nullable().optional(),
    next_step: z.string(),
});

const AppealStatusResponseSchema = z.object({
    success: z.boolean(),
    has_appeal: z.boolean(),
    data: z.object({
        appeal: z.object({
            id: z.string(),
            status: z.string(),
            created_at: z.string(),
            resolved_at: z.string().nullable(),
            resolution_type: z.string().nullable(),
        }).optional(),
    }).optional(),
});

export type AdmissionStartResponse = z.infer<typeof StartAdmissionResponseSchema>;
export type IdentityVerifyResponse = z.infer<typeof IdentityVerifyResponseSchema>;
export type IdentityProviderSessionStartResponse = IdentitySessionStartResponse;
export type IdentityProviderSessionCompleteResponse = IdentitySessionCompleteResponse;
export type LivenessProviderSessionStartResponse = LivenessSessionStartResponse;
export type LivenessProviderSessionCompleteResponse = LivenessSessionCompleteResponse;
export type LivenessProviderSessionResultResponse = LivenessSessionResultResponse;
export type LivenessVerifyResponse = z.infer<typeof LivenessVerifyResponseSchema>;
export type ConsentSubmitResponse = z.infer<typeof ConsentSubmitResponseSchema>;
export type DocumentUploadResponse = z.infer<typeof DocumentUploadResponseSchema>;
export type DocumentSubmitResponse = z.infer<typeof DocumentSubmitResponseSchema>;
export type AppealCreateResponse = z.infer<typeof AppealCreateResponseSchema>;
export type AppealStatusResponse = z.infer<typeof AppealStatusResponseSchema>;

export async function startAdmissionApplication(): Promise<AdmissionStartResponse> {
    return requestJson({
        url: '/api/admission/start',
        schema: StartAdmissionResponseSchema,
        init: { method: 'POST' },
        fallbackError: 'ADMISSION_START_FAILED',
    });
}

export async function submitIdentityVerification(params: {
    identityVerificationId: string;
    name?: string;
    phone?: string;
}): Promise<IdentityVerifyResponse> {
    return requestJson({
        url: '/api/verify/complete',
        schema: IdentityVerifyResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'IDENTITY_VERIFY_FAILED',
    });
}

export async function startIdentityVerificationSession(params: {
    name?: string;
    phone?: string;
}): Promise<IdentityProviderSessionStartResponse> {
    return requestJson({
        url: '/api/admission/identity/session/start',
        schema: IdentitySessionStartResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'IDENTITY_SESSION_START_FAILED',
    });
}

export async function completeIdentityVerificationSession(params: {
    identityVerificationId: string;
    name?: string;
    phone?: string;
}): Promise<IdentityProviderSessionCompleteResponse> {
    return requestJson({
        url: '/api/admission/identity/session/complete',
        schema: IdentitySessionCompleteResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'IDENTITY_SESSION_COMPLETE_FAILED',
    });
}

export async function submitLivenessVerification(params: {
    provider: string;
    confidence: number;
    media_ref: string | null;
    immediate_purge_confirmed: boolean;
}): Promise<LivenessVerifyResponse> {
    return requestJson({
        url: '/api/admission/liveness/verify',
        schema: LivenessVerifyResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'LIVENESS_VERIFY_FAILED',
    });
}

export async function startLivenessVerificationSession(params?: {
    capture_mode?: 'CAMERA';
}): Promise<LivenessProviderSessionStartResponse> {
    return requestJson({
        url: '/api/admission/liveness/session/start',
        schema: LivenessSessionStartResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params || {}),
        },
        fallbackError: 'LIVENESS_SESSION_START_FAILED',
    });
}

export async function completeLivenessVerificationSession(params: {
    session_id: string;
    capture_hash: string;
    capture_width?: number;
    capture_height?: number;
    immediate_purge_confirmed: boolean;
}): Promise<LivenessProviderSessionCompleteResponse> {
    return requestJson({
        url: '/api/admission/liveness/session/complete',
        schema: LivenessSessionCompleteResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'LIVENESS_SESSION_COMPLETE_FAILED',
    });
}

export async function fetchLivenessVerificationSessionResult(params: {
    session_id: string;
}): Promise<LivenessProviderSessionResultResponse> {
    const url = `/api/admission/liveness/session/result?session_id=${encodeURIComponent(params.session_id)}`;
    return requestJson({
        url,
        schema: LivenessSessionResultResponseSchema,
        init: { method: 'GET' },
        fallbackError: 'LIVENESS_SESSION_RESULT_FAILED',
    });
}

export async function submitAdmissionConsents(params: {
    policy_version: string;
    consents: Array<{
        consent_type: string;
        granted: boolean;
        typed_ack_phrase: string;
    }>;
}): Promise<ConsentSubmitResponse> {
    return requestJson({
        url: '/api/consent/submit',
        schema: ConsentSubmitResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'CONSENT_SUBMIT_FAILED',
    });
}

export async function uploadAdmissionDocument(params: {
    documentType: AdmissionDocumentType;
    file: File;
}): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('document_type', params.documentType);

    return requestFormData({
        url: '/api/admission/document/upload',
        schema: DocumentUploadResponseSchema,
        formData,
        fallbackError: 'DOCUMENT_UPLOAD_FAILED',
    });
}

export async function submitAdmissionDocument(params: {
    submission_id: string;
}): Promise<DocumentSubmitResponse> {
    return requestJson({
        url: '/api/admission/document/submit',
        schema: DocumentSubmitResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'DOCUMENT_AI_SUBMIT_FAILED',
    });
}

export async function triggerAdmissionDecision(): Promise<DocumentSubmitResponse> {
    return requestJson({
        url: '/api/admission/review/submit',
        schema: DocumentSubmitResponseSchema,
        init: { method: 'POST' },
        fallbackError: 'REVIEW_SUBMIT_FAILED',
    });
}

export async function createAdmissionAppeal(params: {
    reason_code: string;
    statement: string;
    evidence_ref?: string;
}): Promise<AppealCreateResponse> {
    return requestJson({
        url: '/api/admission/appeal/create',
        schema: AppealCreateResponseSchema,
        init: {
            method: 'POST',
            body: JSON.stringify(params),
        },
        fallbackError: 'APPEAL_CREATE_FAILED',
    });
}

export async function fetchAdmissionAppealStatus(): Promise<AppealStatusResponse> {
    return requestJson({
        url: '/api/admission/appeal/status',
        schema: AppealStatusResponseSchema,
        init: { method: 'GET' },
        fallbackError: 'APPEAL_STATUS_LOAD_FAILED',
    });
}
