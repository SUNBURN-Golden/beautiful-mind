import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'justice.parkit@gmail.com';
    const password = 'SecurePassword123!';

    // Get user id
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    let user = usersData.users.find(u => u.email === email);

    if (!user) {
        console.log('Admin user not found, creating...');
        const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authError || !userData?.user) {
            console.error('Failed to create auth user:', authError);
            return;
        }
        user = userData.user;

        await supabaseAdmin.from('profiles').upsert({
            id: user.id,
            email: email,
            reputation_score: 100,
            verified: true,
            is_admin: true
        });
        console.log('Admin created.');
    } else {
        console.log('Admin user exists. Ensuring is_admin=true...');
        await supabaseAdmin.from('profiles').update({ is_admin: true }).eq('id', user.id);
    }

    // Also let's find the e2e test user to use as a target for Ban / Export
    const e2eUser = usersData.users.find(u => u.email.startsWith('e2e.test.'));
    if (e2eUser) {
        console.log(`\nTARGET_USER_ID: ${e2eUser.id}`);
        console.log(`TARGET_USER_EMAIL: ${e2eUser.email}`);
    } else {
        console.log('\nNo test users found to ban.');
    }
}

run();
