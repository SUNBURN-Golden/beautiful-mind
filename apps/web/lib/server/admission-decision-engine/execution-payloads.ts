import {
    isAdmissionDocumentType,
    REQUIRED_DOCUMENT_TYPES,
} from '../admission-core.ts';
import { ADMISSION_STAGES } from '../../contracts/status-stages.ts';
import type { AdmissionDocumentRow } from './types';

function resolveDecisionNote(decisionNotes: string | undefined, reasonCode: string): string {
    return decisionNotes || reasonCode;
}

export function buildApproveDocumentPatch(params: {
    nowIso: string;
    decisionNotes?: string;
    reasonCode: string;
}): Record<string, unknown> {
    return {
        upload_status: 'PURGED',
        processing_status: 'AI_PASSED',
        final_result: 'VERIFIED',
        human_result: resolveDecisionNote(params.decisionNotes, params.reasonCode),
        file_storage_key_ephemeral: null,
        purged_at: params.nowIso,
        processed_at: params.nowIso,
    };
}

export function buildExceptionDocumentPatch(params: {
    nowIso: string;
}): Record<string, unknown> {
    return {
        upload_status: 'PURGED',
        file_storage_key_ephemeral: null,
        purged_at: params.nowIso,
        processed_at: params.nowIso,
    };
}

export function buildRejectDocumentPatch(params: {
    nowIso: string;
    decisionNotes?: string;
    reasonCode: string;
}): Record<string, unknown> {
    return {
        upload_status: 'PURGED',
        processing_status: 'AI_REJECTED',
        final_result: 'REJECTED',
        human_result: resolveDecisionNote(params.decisionNotes, params.reasonCode),
        file_storage_key_ephemeral: null,
        purged_at: params.nowIso,
        processed_at: params.nowIso,
    };
}

export function resolveResubmitTargetDocumentTypes(
    resubmitDocumentTypes: string[] | undefined,
): Set<string> {
    const targetDocTypeSet = new Set(
        (resubmitDocumentTypes || []).filter((type): type is string => isAdmissionDocumentType(type)),
    );

    if (targetDocTypeSet.size === 0) {
        REQUIRED_DOCUMENT_TYPES.forEach((type) => targetDocTypeSet.add(type));
    }

    return targetDocTypeSet;
}

export function buildResubmitDocumentPatch(params: {
    doc: AdmissionDocumentRow;
    targetDocTypeSet: Set<string>;
    nowIso: string;
    decisionNotes?: string;
    reasonCode: string;
}): Record<string, unknown> {
    const isTarget = params.targetDocTypeSet.has(params.doc.document_type);

    return {
        upload_status: 'PURGED',
        processing_status: isTarget ? 'RESUBMIT_REQUIRED' : 'AI_PASSED',
        final_result: isTarget ? 'RESUBMIT_REQUIRED' : 'VERIFIED',
        human_result: resolveDecisionNote(params.decisionNotes, params.reasonCode),
        file_storage_key_ephemeral: null,
        purged_at: params.nowIso,
        processed_at: params.nowIso,
    };
}

export function buildApproveApplicationUpdate(nowIso: string): Record<string, unknown> {
    return {
        status: 'ACTIVE',
        current_step: ADMISSION_STAGES.ACTIVE,
        approved_at: nowIso,
        rejected_at: null,
        rejection_reason_code: null,
        ai_review_completed_at: nowIso,
        human_review_completed_at: null,
        soul_issued_at: nowIso,
        activated_at: nowIso,
    };
}

export function buildExceptionApplicationUpdate(params: {
    nowIso: string;
    reasonCode: string;
}): Record<string, unknown> {
    return {
        status: 'EXCEPTION_REQUIRED',
        current_step: ADMISSION_STAGES.EXCEPTION_REVIEW,
        ai_review_completed_at: params.nowIso,
        rejection_reason_code: params.reasonCode,
    };
}

export function buildRejectApplicationUpdate(params: {
    nowIso: string;
    reasonCode: string;
}): Record<string, unknown> {
    return {
        status: 'REJECTED',
        current_step: ADMISSION_STAGES.REJECTED,
        rejected_at: params.nowIso,
        rejection_reason_code: params.reasonCode,
        ai_review_completed_at: params.nowIso,
        approved_at: null,
        soul_issued_at: null,
        activated_at: null,
    };
}

export function buildResubmitApplicationUpdate(params: {
    nowIso: string;
    reasonCode: string;
}): Record<string, unknown> {
    return {
        status: 'RESUBMIT_REQUIRED',
        current_step: ADMISSION_STAGES.RESUBMIT_REQUIRED,
        rejected_at: null,
        rejection_reason_code: params.reasonCode,
        ai_review_completed_at: params.nowIso,
    };
}
