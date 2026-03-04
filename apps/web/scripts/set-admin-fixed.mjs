import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAdmin() {
    const { data: usersData, error: usersErr } = await s.auth.admin.listUsers();

    if (usersErr) {
        console.error('Failed to list auth users:', usersErr);
        return;
    }

    const adminUser = usersData.users.find(u => u.email === 'admin@soulbound.foundation');
    if (!adminUser) {
        console.error('No auth user found with email admin@soulbound.foundation');
        return;
    }

    console.log(`Found Auth User: ${adminUser.id}`);

    // Attempt to upsert the profile directly with the bypass flags
    const { error: upsertErr } = await s.from('profiles').upsert({
        id: adminUser.id,
        email: adminUser.email,
        is_admin: true,
        verified: true,
        onboarding_step: 'COMPLETED'
    });

    if (upsertErr) {
        console.error('Failed to upsert admin profile:', upsertErr);
    } else {
        console.log('Successfully upserted admin profile to bypass onboarding screens!');
    }
}

fixAdmin();
