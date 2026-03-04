import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: users } = await s.auth.admin.listUsers();
    const adminUser = users.users.find(u => u.email === 'admin@soulbound.foundation');
    if (!adminUser) {
        console.log('Admin user not found in auth');
        return;
    }
    console.log('Admin User ID:', adminUser.id);

    // Update the profile to skip onboarding
    const { error } = await s.from('profiles').update({
        is_admin: true,
        verified: true,
        has_consented: true,
        has_signed_contract: true
    }).eq('id', adminUser.id);

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Successfully updated admin profile to bypass onboarding.');
    }

    // Create dummy consents/contracts records just in case the app checks those tables directly
    await s.from('consents').upsert({ user_id: adminUser.id, consent_type: 'terms', is_agreed: true }, { onConflict: 'user_id, consent_type' }).catch(() => { });
    await s.from('consents').upsert({ user_id: adminUser.id, consent_type: 'privacy', is_agreed: true }, { onConflict: 'user_id, consent_type' }).catch(() => { });
    await s.from('contracts').upsert({ user_id: adminUser.id, is_signed: true }, { onConflict: 'user_id' }).catch(() => { });

    console.log('Done!');
}

run();
