import type { SupabaseClient } from '@supabase/supabase-js';
import { writeTrustLedgerEvent } from '../admission-events.ts';
import type { ReviewSessionRow } from './types.ts';
import { findLatestApplicationId, getMatchForUser, resolvePartnerId } from './shared.ts';

export async function completeActiveMeeting(admin: SupabaseClient, userId: string, matchId: string) {
    const match = await getMatchForUser(admin, userId, matchId);
    const partnerId = resolvePartnerId(match, userId);

    const { data: existingSession, error: existingError } = await admin
        .from('review_sessions')
        .select('id,match_id,reviewer_id,target_id,stage,created_at')
        .eq('match_id', matchId)
        .eq('reviewer_id', userId)
        .neq('stage', 'ABORTED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<ReviewSessionRow>();

    if (existingError) {
        throw new Error(`REVIEW_SESSION_LOOKUP_FAILED:${existingError.message}`);
    }

    let reviewSessionId = existingSession?.id || null;

    if (!reviewSessionId) {
        const { data: insertedSession, error: insertError } = await admin
            .from('review_sessions')
            .insert({
                match_id: matchId,
                reviewer_id: userId,
                target_id: partnerId,
                stage: 'DRAFT',
            })
            .select('id')
            .single<{ id: string }>();

        if (insertError || !insertedSession) {
            throw new Error(`REVIEW_SESSION_CREATE_FAILED:${insertError?.message || 'NO_ROW'}`);
        }

        reviewSessionId = insertedSession.id;
    }

    const applicationId = await findLatestApplicationId(admin, userId);

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId,
        eventType: 'ACTIVE_MEETING_CONFIRMED',
        payload: {
            match_id: matchId,
            review_session_id: reviewSessionId,
            confirmed_at: new Date().toISOString(),
        },
    });

    return {
        review_session_id: reviewSessionId,
        transition_messages: [
            { sender: 'System', text: '[System] Meeting confirmation has been recorded for both participants.' },
            { sender: 'System', text: '[System] Continuing to structured trust attestation.' },
        ],
    };
}
