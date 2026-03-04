import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = `e2e.test.${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (authError || !userData?.user) {
        console.error('Failed to create auth user:', authError);
        return;
    }

    const userId = userData.user.id;
    console.log('Created Auth User:', email, 'ID:', userId);

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        reputation_score: 100,
        verified: false,
    });

    if (profileError) {
        console.error('Failed to create profile:', profileError);
        return;
    }

    console.log('Created Profile (verified: false)');
    console.log(`${email}`);
}

run();
