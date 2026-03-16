import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchRow } from './types.ts';
import { displayNameOrFallback, fetchProfileMap, resolvePartnerId } from './shared.ts';

export async function listActiveMatches(admin: SupabaseClient, userId: string) {
    const { data, error } = await admin
        .from('matches')
        .select('id,user1_id,user2_id,status,match_score,updated_at,created_at')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(50)
        .returns<MatchRow[]>();

    if (error) {
        throw new Error(`MATCHES_FETCH_FAILED:${error.message}`);
    }

    const matches = data || [];
    const partnerIds = Array.from(new Set(matches.map((row) => resolvePartnerId(row, userId))));
    const profileMap = await fetchProfileMap(admin, partnerIds);

    return matches.map((row) => {
        const partnerId = resolvePartnerId(row, userId);
        const partnerProfile = profileMap.get(partnerId);

        const trustSignal = typeof row.match_score === 'number' && Number.isFinite(row.match_score)
            ? Math.round(row.match_score)
            : null;

        return {
            id: row.id,
            partner_id: partnerId,
            partner_name: displayNameOrFallback(partnerProfile?.display_name || null, partnerId),
            trust_signal: trustSignal,
            status: row.status,
            tags: trustSignal === null
                ? ['Signal pending']
                : trustSignal >= 100
                    ? ['Priority connection']
                    : ['Needs additional verification'],
            updated_at: row.updated_at,
        };
    });
}
