import type { SupabaseClient } from '@supabase/supabase-js';
import { ADMISSION_POLICY_VERSION } from './constants.ts';

export type AdmissionApplicationRow = {
    id: string;
    user_id: string;
    status: string;
    current_step: string;
    policy_version: string;
    submitted_at: string | null;
    liveness_verified_at: string | null;
    approved_at: string | null;
    soul_issued_at: string | null;
    activated_at: string | null;
    rejection_reason_code: string | null;
};

const APPLICATION_SELECT_COLUMNS = 'id,user_id,status,current_step,policy_version,submitted_at,liveness_verified_at,approved_at,soul_issued_at,activated_at,rejection_reason_code';

export async function getOrCreateAdmissionApplication(
    admin: SupabaseClient,
    userId: string,
): Promise<AdmissionApplicationRow> {
    const { data: existing, error: existingError } = await admin
        .from('admission_applications')
        .select(APPLICATION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle<AdmissionApplicationRow>();

    if (existingError) {
        throw new Error(existingError.message);
    }

    if (existing) {
        return existing;
    }

    const nowIso = new Date().toISOString();
    const { data: created, error: createError } = await admin
        .from('admission_applications')
        .insert({
            user_id: userId,
            status: 'IN_PROGRESS',
            current_step: 'APPLY_START',
            policy_version: ADMISSION_POLICY_VERSION,
            started_at: nowIso,
        })
        .select(APPLICATION_SELECT_COLUMNS)
        .single<AdmissionApplicationRow>();

    if (createError || !created) {
        throw new Error(createError?.message || 'Failed to create admission application');
    }

    return created;
}

export async function ensureAdmissionApplication(
    admin: SupabaseClient,
    userId: string,
): Promise<{ application: AdmissionApplicationRow; isNew: boolean }> {
    const { data: existing, error: existingError } = await admin
        .from('admission_applications')
        .select(APPLICATION_SELECT_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle<AdmissionApplicationRow>();

    if (existingError) {
        throw new Error(existingError.message);
    }

    if (existing) {
        return { application: existing, isNew: false };
    }

    const application = await getOrCreateAdmissionApplication(admin, userId);
    return { application, isNew: true };
}
