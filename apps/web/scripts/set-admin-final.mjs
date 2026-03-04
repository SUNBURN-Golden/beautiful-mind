import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    const { data: usersData } = await s.auth.admin.listUsers();
    const adminUser = usersData.users.find(u => u.email === 'admin@soulbound.foundation');
    if (!adminUser) { return console.log('Admin user not found in auth'); }

    console.log(`Setting is_admin=true for ${adminUser.id}`);

    // Check if profile exists
    const { data: prof } = await s.from('profiles').select('id').eq('id', adminUser.id).single();

    if (prof) {
        const { error } = await s.from('profiles').update({ is_admin: true, verified: true }).eq('id', adminUser.id);
        console.log('Update result:', error ? error.message : 'Success');
    } else {
        const { error } = await s.from('profiles').insert({
            id: adminUser.id,
            email: adminUser.email,
            is_admin: true,
            verified: true
        });
        console.log('Insert result:', error ? error.message : 'Success');
    }
}
fix();
