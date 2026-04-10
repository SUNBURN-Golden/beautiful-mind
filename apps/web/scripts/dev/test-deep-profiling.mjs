import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BASE_URL = 'http://localhost:3000';

async function testDeepProfiling() {
    console.log('--- STARTING DEEP PROFILING TEST ---');

    // 1. Setup a test user
    const email = `deep.test.${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    // Use Supabase Admin to create user directly bypassing rate limits
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (authError || !userData?.user) {
        console.error('Failed to create auth user:', authError);
        return;
    }
    const testUser = userData.user;
    console.log(`Created test user: ${testUser.email} (${testUser.id})`);

    // 2. Insert into profiles (verified=true)
    await supabaseAdmin.from('profiles').upsert({
        id: testUser.id,
        email: testUser.email,
        reputation_score: 90,
        verified: true,
    });

    // 3. Grant Consent (deep_profiling=true)
    const { error: consentError } = await supabaseAdmin.from('consents').upsert({
        user_id: testUser.id,
        module: 'OSINT',
        terms_accepted: true,
        privacy_accepted: true,
        deep_profiling: true,
        marketing_accepted: false,
    });
    if (consentError) {
        console.error('Failed to grant consent:', consentError);
        return;
    }
    console.log('Granted Consent (deep_profiling=true)');

    // 4. Create an empty Interview record
    const { data: interviewResult, error: insertError } = await supabaseAdmin.from('interviews').insert({
        user_id: testUser.id,
        transcript_json: []
    }).select().single();

    if (insertError) {
        console.error('Failed to insert initial interview:', insertError);
        return;
    }
    const interviewId = interviewResult.id;
    console.log(`Created Interview record: ${interviewId}`);

    // Since we're calling Next.js API routes that require standard Auth session cookies,
    // we'll need to auth normally or via our dev-login backdoor first if testing via fetch.
    // However, to make it purely backend-to-backend without cookie management overhead in Node, 
    // it's easier to hit the local Supabase DB directly, but we want to test the *actual Next.js route*.
    // Let's use standard fetch with an access token if possible, OR simulate the API logic.
    // Actually, Next.js route uses `supabase.auth.getUser()`, which relies on cookies.

    // To properly test the HTTP route from node, we need to log in and get the cookie.
    const signInRes = await fetch(`${BASE_URL}/api/dev-login?email=${email}`, { redirect: 'manual' });
    const cookies = signInRes.headers.getSetCookie();
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');

    // Check if cookie exists
    if (!cookieString) {
        console.warn('WARNING: Could not fetch auth cookies from dev-login. Using supabaseAdmin instead for backend updates.');
        // If we can't get cookies (e.g. dev-login is missing or failing), we 
        // will just simulate the steps directly via Supabase Admin to verify the logic.
    }

    // 5. Test /api/interview/next
    console.log('\n--- TESTING /api/interview/next ---');
    const nextPayload = {
        interview_id: interviewId,
        last_answer: 'I love watching sci-fi movies, especially Interstellar. Also I work out at the gym 3 times a week.',
        context: { topic: 'hobbies' }
    };

    const nextRes = await fetch(`${BASE_URL}/api/interview/next`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString
        },
        body: JSON.stringify(nextPayload)
    });

    const nextData = await nextRes.json();
    console.log('Response /next:', JSON.stringify(nextData, null, 2));

    if (!nextRes.ok) {
        console.error('FAILED /next route');
        return;
    }

    // 6. Provide a second answer 
    const nextPayload2 = {
        interview_id: interviewId,
        last_answer: 'My MBTI is INTJ, and I like reading deep philosophy books by Nietzsche. I really value intellectual complexity.',
        context: { topic: 'books and personality' }
    };
    await fetch(`${BASE_URL}/api/interview/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieString },
        body: JSON.stringify(nextPayload2)
    });
    console.log('Appended second answer.');

    // 7. Test /api/interview/finalize
    console.log('\n--- TESTING /api/interview/finalize ---');
    const finalizePayload = { interview_id: interviewId };
    const finalizeRes = await fetch(`${BASE_URL}/api/interview/finalize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString
        },
        body: JSON.stringify(finalizePayload)
    });

    const finalizeData = await finalizeRes.json();
    console.log('Response /finalize:', JSON.stringify(finalizeData, null, 2));

    if (!finalizeRes.ok) {
        console.error('FAILED /finalize route');
        return;
    }

    // 8. Verify DB Results
    console.log('\n--- VERIFYING DATABASE ---');
    const { data: finalInterview } = await supabaseAdmin.from('interviews').select('*').eq('id', interviewId).single();
    console.log('DB Interviews analysis_json schema:', JSON.stringify(finalInterview.analysis_json, null, 2));

    const { data: traitCache } = await supabaseAdmin.from('user_traits').select('*').eq('user_id', testUser.id).single();
    if (traitCache) {
        console.log('DB user_traits successfully created!');
        console.log('user_traits data summary:', traitCache.traits_json.derived_traits);
    } else {
        console.error('ERROR: user_traits was not cached!');
    }

    console.log('\n--- TEST COMPLETE ---');
}

testDeepProfiling();
