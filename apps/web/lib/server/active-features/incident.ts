import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { writeTrustLedgerEvent } from '../admission-events.ts';
import { findLatestApplicationId, getMatchForUser } from './shared.ts';

export async function submitActiveIncidentReport(
    admin: SupabaseClient,
    userId: string,
    params: {
        summary: string;
        targetLabel?: string | null;
        matchId?: string | null;
    },
) {
    const reportId = randomUUID();
    const nowIso = new Date().toISOString();
    let linkedMatchId: string | null = null;

    if (params.matchId) {
        const match = await getMatchForUser(admin, userId, params.matchId);
        linkedMatchId = match.id;
    }

    const { error: auditInsertError } = await admin
        .from('audit_logs')
        .insert({
            table_name: 'active_incident_reports',
            record_id: reportId,
            action: 'INSERT',
            new_data: {
                report_id: reportId,
                summary: params.summary,
                target_label: params.targetLabel || null,
                match_id: linkedMatchId,
                submitted_at: nowIso,
            },
            changed_by: userId,
        });

    if (auditInsertError) {
        throw new Error(`INCIDENT_AUDIT_LOG_FAILED:${auditInsertError.message}`);
    }

    const applicationId = await findLatestApplicationId(admin, userId);

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId,
        eventType: 'ACTIVE_INCIDENT_REPORTED',
        payload: {
            report_id: reportId,
            match_id: linkedMatchId,
            target_label: params.targetLabel || null,
            summary: params.summary,
            submitted_at: nowIso,
        },
    });

    return {
        report_id: reportId,
        submitted_at: nowIso,
        escalation_queued: true,
        linked_match_id: linkedMatchId,
    };
}
