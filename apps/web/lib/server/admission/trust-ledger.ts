import type { SupabaseClient } from '@supabase/supabase-js';

export async function writeTrustLedgerEvent(
    admin: SupabaseClient,
    params: {
        userId: string;
        applicationId?: string | null;
        soulCredentialId?: string | null;
        eventType: string;
        payload?: Record<string, unknown>;
    },
): Promise<void> {
    const { error } = await admin.rpc('log_trust_ledger_event', {
        p_user_id: params.userId,
        p_admission_application_id: params.applicationId || null,
        p_soul_credential_id: params.soulCredentialId || null,
        p_event_type: params.eventType,
        p_event_payload: params.payload || {},
    });

    if (error) {
        throw new Error(error.message);
    }
}
