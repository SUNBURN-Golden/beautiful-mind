import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceRoleKey);

async function verifyUser() {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData.users.find(u => u.email === 'portone.test.1771833251493@example.com');
    if (!user) return console.log('User not found');

    const { error: pErr } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        verified: true
    });
    console.log('Force Verified Result:', pErr || 'SUCCESS');
}
verifyUser();
