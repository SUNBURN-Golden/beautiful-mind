'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * Bans a user by updating their profile and logging the audit event.
 * Note: To completely block auth, we should ideally use Supabase Admin API 
 * `supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })`, 
 * but since that requires SERVICE_ROLE_KEY and we might not want to expose it in all actions,
 * we handle it by setting `profiles.banned = true` and enforcing it via middleware or RLS.
 * However, since we have the service role key, we can do both for maximum security.
 */
export async function banUser(userId: string, reason: string) {
    const supabase = await createClient();

    // Verify caller is admin
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) return { error: 'Unauthorized' };

    const { data: callerProfile } = await supabase.from('profiles').select('is_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_admin) return { error: 'Forbidden' };

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update profile to banned using admin client
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ banned: true })
        .eq('id', userId);

    if (updateError) {
        return { error: updateError.message };
    }

    // Log the ban action manually if trigger doesn't cover this specific intent description,
    // although the trigger logs the UPDATE anyway. We can insert a generic audit log for the explicit ban reason.
    await supabaseAdmin.from('audit_logs').insert({
        table_name: 'profiles',
        record_id: userId,
        action: 'UPDATE',
        new_data: { status: 'BANNED', reason },
        changed_by: caller.id
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return { success: true };
}
