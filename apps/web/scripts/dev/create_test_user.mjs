import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser() {
    const email = `portone.test.${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    console.log('Creating test user via Admin API...', email);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (error) {
        console.error('Failed to create user:', error);
        return;
    }

    console.log('User created successfully:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', data.user.id);
}

createTestUser();
