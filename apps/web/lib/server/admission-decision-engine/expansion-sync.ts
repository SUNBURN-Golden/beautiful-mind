import type { SupabaseClient } from '@supabase/supabase-js';
import { generatePolicyChangeProposals, refreshAdmissionOpsForDay } from '@/lib/server/admission-ops/service';

export async function syncAdmissionDecisionExpansions(
    admin: SupabaseClient,
    day: string,
): Promise<void> {
    await refreshAdmissionOpsForDay(admin, day);
    await generatePolicyChangeProposals(admin, day);
}
