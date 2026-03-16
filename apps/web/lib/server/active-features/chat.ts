import type { SupabaseClient } from '@supabase/supabase-js';
import { writeTrustLedgerEvent } from '../admission-events.ts';
import type { MessageRow } from './types.ts';
import { displayNameOrFallback, fetchProfileMap, getMatchForUser, resolvePartnerId } from './shared.ts';

export async function listChatMessages(admin: SupabaseClient, userId: string, matchId: string) {
    const match = await getMatchForUser(admin, userId, matchId);
    const partnerId = resolvePartnerId(match, userId);

    const profileMap = await fetchProfileMap(admin, [userId, partnerId]);
    const selfName = displayNameOrFallback(profileMap.get(userId)?.display_name || null, userId);
    const partnerName = displayNameOrFallback(profileMap.get(partnerId)?.display_name || null, partnerId);

    const { data, error } = await admin
        .from('messages')
        .select('id,match_id,sender_id,content,created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
        .limit(200)
        .returns<MessageRow[]>();

    if (error) {
        throw new Error(`CHAT_MESSAGES_FETCH_FAILED:${error.message}`);
    }

    const messages = (data || []).map((row) => ({
        id: row.id,
        sender: row.sender_id === userId ? selfName : partnerName,
        mine: row.sender_id === userId,
        text: row.content,
        sent_at: row.created_at,
    }));

    return {
        match_id: match.id,
        partner_id: partnerId,
        partner_name: partnerName,
        messages,
    };
}

export async function sendChatMessage(
    admin: SupabaseClient,
    userId: string,
    params: { matchId: string; content: string },
) {
    const match = await getMatchForUser(admin, userId, params.matchId);
    if (match.status !== 'ACTIVE') {
        throw new Error('MATCH_INACTIVE');
    }

    const trimmedContent = params.content.trim();
    if (trimmedContent.length === 0) {
        throw new Error('MESSAGE_EMPTY');
    }

    const { data, error } = await admin
        .from('messages')
        .insert({
            match_id: params.matchId,
            sender_id: userId,
            content: trimmedContent,
        })
        .select('id,match_id,sender_id,content,created_at')
        .single<MessageRow>();

    if (error || !data) {
        throw new Error(`CHAT_MESSAGE_INSERT_FAILED:${error?.message || 'NO_ROW'}`);
    }

    await writeTrustLedgerEvent(admin, {
        userId,
        eventType: 'ACTIVE_CHAT_MESSAGE_SENT',
        payload: {
            match_id: params.matchId,
            message_id: data.id,
        },
    });

    return {
        id: data.id,
        sender: 'You',
        mine: true,
        text: data.content,
        sent_at: data.created_at,
    };
}
