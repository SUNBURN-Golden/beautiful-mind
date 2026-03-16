import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMISSION_STAGES, type AdmissionStage } from '../../contracts/status-stages.ts';
import { fetchCoreStatusInputs } from './core-queries.ts';
import { fetchStatusExpansionInputs } from './expansion-queries.ts';
import type { StatusQueryResult } from './types.ts';
import {
    deriveStatusTruth,
    EMPTY_STATUS_OVERLAYS,
    EMPTY_STATUS_TRUTH_OVERLAYS,
} from './truth.ts';

const CORE_ONLY_STATUS_STAGES: ReadonlySet<AdmissionStage> = new Set([
    ADMISSION_STAGES.APPLY_START,
    ADMISSION_STAGES.IDENTITY,
    ADMISSION_STAGES.LIVENESS,
    ADMISSION_STAGES.CONSENTS,
]);

export async function fetchStatusInputs(
    admin: SupabaseClient,
    userId: string,
): Promise<StatusQueryResult> {
    const coreResult = await fetchCoreStatusInputs(admin, userId);
    const coreTruth = {
        ...coreResult.inputs,
        ...EMPTY_STATUS_TRUTH_OVERLAYS,
    };

    if (coreTruth.profile?.banned) {
        return {
            profileError: coreResult.profileError,
            truth: coreTruth,
            overlays: EMPTY_STATUS_OVERLAYS,
        };
    }

    const coreStage = deriveStatusTruth(coreTruth).stage;
    if (CORE_ONLY_STATUS_STAGES.has(coreStage)) {
        return {
            profileError: coreResult.profileError,
            truth: coreTruth,
            overlays: EMPTY_STATUS_OVERLAYS,
        };
    }

    const expansionResult = await fetchStatusExpansionInputs(admin, userId);

    return {
        profileError: coreResult.profileError,
        truth: {
            ...coreResult.inputs,
            ...expansionResult.truth,
        },
        overlays: expansionResult.overlays,
    };
}
