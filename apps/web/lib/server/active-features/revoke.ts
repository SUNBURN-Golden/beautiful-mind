import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { writeTrustLedgerEvent } from '../admission-events.ts';
import { findLatestApplicationId } from './shared.ts';

export async function submitParticipationRevokeRequest(
    admin: SupabaseClient,
    userId: string,
    params: {
        pauseParticipation: boolean;
        withdrawDataProcessing: boolean;
    },
) {
    const requestId = randomUUID();
    const nowIso = new Date().toISOString();
    let hiddenMatches = 0;

    if (params.pauseParticipation) {
        const { data: hiddenRows, error: hideError } = await admin
            .from('matches')
            .update({ status: 'HIDDEN' })
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .eq('status', 'ACTIVE')
            .select('id');

        if (hideError) {
            throw new Error(`MATCH_HIDE_FAILED:${hideError.message}`);
        }

        hiddenMatches = hiddenRows?.length || 0;
    }

    const { error: auditInsertError } = await admin
        .from('audit_logs')
        .insert({
            table_name: 'active_participation_revoke_requests',
            record_id: requestId,
            action: 'INSERT',
            new_data: {
                request_id: requestId,
                pause_participation: params.pauseParticipation,
                withdraw_data_processing: params.withdrawDataProcessing,
                hidden_matches: hiddenMatches,
                submitted_at: nowIso,
            },
            changed_by: userId,
        });

    if (auditInsertError) {
        throw new Error(`REVOKE_AUDIT_LOG_FAILED:${auditInsertError.message}`);
    }

    const applicationId = await findLatestApplicationId(admin, userId);

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId,
        eventType: 'ACTIVE_PARTICIPATION_REVOKE_REQUESTED',
        payload: {
            request_id: requestId,
            pause_participation: params.pauseParticipation,
            withdraw_data_processing: params.withdrawDataProcessing,
            hidden_matches: hiddenMatches,
            submitted_at: nowIso,
        },
    });

    return {
        request_id: requestId,
        submitted_at: nowIso,
        status: 'RECEIVED' as const,
        hidden_matches: hiddenMatches,
    };
}
