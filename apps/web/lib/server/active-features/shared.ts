import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchRow, ProfileRow } from './types.ts';

export function resolvePartnerId(match: MatchRow, userId: string): string {
    return match.user1_id === userId ? match.user2_id : match.user1_id;
}

export function displayNameOrFallback(displayName: string | null, userId: string): string {
    if (displayName && displayName.trim().length > 0) {
        return displayName;
    }
    return `User-${userId.slice(0, 8)}`;
}

export async function getMatchForUser(admin: SupabaseClient, userId: string, matchId: string): Promise<MatchRow> {
    const { data, error } = await admin
        .from('matches')
        .select('id,user1_id,user2_id,status,match_score,updated_at,created_at')
        .eq('id', matchId)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle<MatchRow>();

    if (error || !data) {
        throw new Error('MATCH_NOT_FOUND');
    }

    return data;
}

export async function fetchProfileMap(admin: SupabaseClient, userIds: string[]): Promise<Map<string, ProfileRow>> {
    if (userIds.length === 0) {
        return new Map();
    }

    const { data } = await admin
        .from('profiles')
        .select('id,display_name')
        .in('id', userIds)
        .returns<ProfileRow[]>();

    return new Map((data || []).map((row) => [row.id, row]));
}

export async function findLatestApplicationId(admin: SupabaseClient, userId: string): Promise<string | null> {
    const { data } = await admin
        .from('admission_applications')
        .select('id,status,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; status: string; created_at: string }>();

    return data?.id || null;
}
