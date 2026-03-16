import type { SupabaseClient } from '@supabase/supabase-js';
import { syncAdmissionDecisionExpansions } from '@/lib/server/admission-decision-engine/expansion-sync';

const MAX_TRACKED_EXPANSION_DAYS = 7;
const expansionSyncByDay = new Map<string, Promise<void>>();

function rememberExpansionSync(day: string, promise: Promise<void>) {
    expansionSyncByDay.set(day, promise);
    while (expansionSyncByDay.size > MAX_TRACKED_EXPANSION_DAYS) {
        const oldest = expansionSyncByDay.keys().next().value;
        if (!oldest) {
            break;
        }
        expansionSyncByDay.delete(oldest);
    }
}

export async function runAdmissionDecisionPostCommit(
    admin: SupabaseClient,
    nowIso: string,
): Promise<void> {
    const day = nowIso.slice(0, 10);
    if (expansionSyncByDay.has(day)) {
        return;
    }

    const syncPromise = syncAdmissionDecisionExpansions(admin, day).catch((opsError) => {
        expansionSyncByDay.delete(day);
        console.error('runAdmissionDecisionPostCommit failed', opsError);
    });

    rememberExpansionSync(day, syncPromise);
    await syncPromise;
}
