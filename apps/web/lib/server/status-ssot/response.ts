import { ADMISSION_STAGES } from '../../contracts/status-stages.ts';
import type { StatusResponse, StatusResponseSource } from './types.ts';
import { buildStatusMeta } from './meta.ts';
import { deriveStatusTruth } from './truth.ts';

export function buildStatusResponse(
    source: StatusResponseSource,
    opts?: { serverTime?: string },
): StatusResponse {
    const derived = deriveStatusTruth(source.truth);
    const response: StatusResponse = {
        stage: derived.stage,
        step: derived.stage,
        completed: derived.stage === ADMISSION_STAGES.ACTIVE,
        next: derived.stage,
        blockers: derived.blockers,
        details: {
            missing_document_types: derived.documentProgress.missing,
            missing_consents: derived.consentProgress.missingConsents,
        },
        meta: buildStatusMeta({
            truth: source.truth,
            overlays: source.overlays,
            derived,
            serverTime: opts?.serverTime || new Date().toISOString(),
        }),
    };

    return response;
}
