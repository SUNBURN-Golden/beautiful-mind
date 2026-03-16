import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveReviewSubmitData, ActiveReviewSubmitRequest } from '../contracts/active-review-contract.ts';
import { writeTrustLedgerEvent } from './admission-events.ts';

type ReviewSessionRow = {
    id: string;
};

type LatestApplicationRow = {
    id: string;
};

async function findLatestAdmissionApplicationId(admin: SupabaseClient, userId: string): Promise<string | null> {
    const { data } = await admin
        .from('admission_applications')
        .select('id,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<LatestApplicationRow & { created_at: string }>();

    return data?.id || null;
}

async function findReviewSessionId(
    admin: SupabaseClient,
    userId: string,
    matchId: string | null,
): Promise<string | null> {
    let query = admin
        .from('review_sessions')
        .select('id,created_at')
        .eq('reviewer_id', userId)
        .neq('stage', 'ABORTED')
        .order('created_at', { ascending: false })
        .limit(1);

    if (matchId) {
        query = query.eq('match_id', matchId);
    }

    const { data, error } = await query.maybeSingle<ReviewSessionRow & { created_at: string }>();
    if (error) {
        throw new Error(`REVIEW_SESSION_LOOKUP_FAILED:${error.message}`);
    }

    return data?.id || null;
}

function buildAttestationEventId(): string {
    return `TA-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
}

function normalizeSelectedItems(items: string[]): string[] {
    const deduped = new Set<string>();
    for (const item of items) {
        const normalized = item.trim();
        if (normalized.length > 0) {
            deduped.add(normalized);
        }
    }
    return Array.from(deduped.values());
}

export async function submitActiveTrustAttestation(
    admin: SupabaseClient,
    userId: string,
    params: ActiveReviewSubmitRequest,
): Promise<ActiveReviewSubmitData> {
    const selectedItems = normalizeSelectedItems(params.selected_items);
    if (selectedItems.length === 0) {
        throw new Error('ATTESTATION_SELECTED_ITEMS_EMPTY');
    }

    const eventId = buildAttestationEventId();
    const submittedAt = new Date().toISOString();
    const note = params.note?.trim() || '';
    const reviewSessionId = await findReviewSessionId(admin, userId, params.match_id || null);
    const applicationId = await findLatestAdmissionApplicationId(admin, userId);

    const { error: auditInsertError } = await admin
        .from('audit_logs')
        .insert({
            table_name: 'active_trust_attestations',
            record_id: eventId,
            action: 'INSERT',
            new_data: {
                event_id: eventId,
                review_session_id: reviewSessionId,
                selected_items: selectedItems,
                escalation_requested: params.escalation_requested,
                note,
                note_length: note.length,
                submitted_at: submittedAt,
            },
            changed_by: userId,
        });

    if (auditInsertError) {
        throw new Error(`TRUST_ATTESTATION_AUDIT_LOG_FAILED:${auditInsertError.message}`);
    }

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId,
        eventType: 'ACTIVE_TRUST_ATTESTATION_SUBMITTED',
        payload: {
            event_id: eventId,
            review_session_id: reviewSessionId,
            selected_items: selectedItems,
            escalation_requested: params.escalation_requested,
            note_length: note.length,
            submitted_at: submittedAt,
        },
    });

    return {
        event_id: eventId,
        submitted_at: submittedAt,
        selected_items: selectedItems,
        escalation_requested: params.escalation_requested,
    };
}
