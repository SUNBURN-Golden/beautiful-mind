import { resolveStatusStage } from '../stageRoutes.ts';
import type { AdmissionStage } from './status-stages.ts';

type JsonObject = Record<string, unknown>;

export type StatusMeta = JsonObject;
export type StatusDetails = JsonObject & {
    missing_document_types?: string[];
    missing_consents?: string[];
};

export type ClientStatusContract = {
    stage?: AdmissionStage;
    // Compatibility alias for legacy UI consumers.
    step?: AdmissionStage;
    error: string | null;
    meta?: StatusMeta;
    details?: StatusDetails;
    blockers: string[];
};

function asObject(value: unknown): JsonObject | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as JsonObject;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
}

export function parseStatusContract(payload: unknown): ClientStatusContract {
    const obj = asObject(payload);
    if (!obj) {
        return {
            error: 'INVALID_STATUS_PAYLOAD',
            blockers: [],
        };
    }

    const resolvedStage = resolveStatusStage({
        stage: obj.stage,
        step: obj.step,
    });

    const meta = asObject(obj.meta) || undefined;
    const detailsObj = asObject(obj.details);
    const details: StatusDetails | undefined = detailsObj
        ? {
            ...detailsObj,
            missing_document_types: asStringArray(detailsObj.missing_document_types),
            missing_consents: asStringArray(detailsObj.missing_consents),
        }
        : undefined;

    return {
        stage: resolvedStage || undefined,
        step: resolvedStage || undefined,
        error: typeof obj.error === 'string' ? obj.error : null,
        meta,
        details,
        blockers: asStringArray(obj.blockers),
    };
}

export function parseStatusErrorCode(payload: unknown, fallback = 'STATUS_FETCH_FAILED'): string {
    const obj = asObject(payload);
    if (!obj) {
        return fallback;
    }

    if (typeof obj.error === 'string' && obj.error.length > 0) {
        return obj.error;
    }

    const nestedError = asObject(obj.error);
    if (nestedError && typeof nestedError.message === 'string' && nestedError.message.length > 0) {
        return nestedError.message;
    }
    if (nestedError && typeof nestedError.code === 'string' && nestedError.code.length > 0) {
        return nestedError.code;
    }

    return fallback;
}

export function getStatusStage(
    status: Pick<ClientStatusContract, 'stage' | 'step'> | null | undefined,
): AdmissionStage | null {
    return resolveStatusStage(status || null);
}
