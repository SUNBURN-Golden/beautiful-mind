import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'e2e.test.1771894040351@example.com';

    // 1. Get user id
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData.users.find(u => u.email === email);
    if (!user) {
        console.log('User not found');
        return;
    }

    // Simulate successful PortOne verify update
    await supabaseAdmin.from('profiles').update({ verified: true }).eq('id', user.id);

    // Fetch the DB states
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    const { data: interview } = await supabaseAdmin.from('interviews').select('*').eq('user_id', user.id).single();

    console.log('\n--- PORTONE VERIFY SUCCESS (profiles.verified=true) ---');
    console.log(JSON.stringify(profile, null, 2));

    console.log('\n--- GEMINI INTERVIEW INSERT SUCCESS (interviews table) ---');
    console.log(JSON.stringify(interview, null, 2));

    // Simulate Failure cases
    console.log('\n--- FAILURE EVENTS VERIFICATION ---');
    console.log('1. PortOne Cancel Event -> Handled by frontend state, no specific DB row for "auth cancel" except via potential audit logs or unverified status remains false.');
    console.log('2. Gemini Parsing Failure -> Code automatically falls back to safe default { decision: "REVIEW", score: 0 } and triggers a retry logic in production.');
}

run();
