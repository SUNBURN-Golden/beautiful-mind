import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runTest() {
    console.log("🚀 Starting Phase 3 /api/me/status Smoke Test\\n");

    const email = `test_phase3_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const { data: { user }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createErr) throw createErr;

    // Supabase Auth does not automatically trigger public.profiles creation in this schema.
    const { error: seedErr } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email: email,
        verified: false,
        banned: false
    });
    if (seedErr) throw seedErr;

    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: { session }, error: signinErr } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (signinErr) throw signinErr;

    const token = session.access_token;

    async function checkStatus(label) {
        console.log(`\\n--- ${label} ---`);
        const res = await fetch('http://localhost:3000/api/me/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        console.log(`${res.status} ${res.statusText}`);
        console.log(JSON.stringify(json, null, 2));
    }

    // 1. Unauthenticated
    console.log(`\\n--- 1. unauthenticated ---`);
    const res1 = await fetch('http://localhost:3000/api/me/status');
    console.log(`${res1.status} ${res1.statusText}`);
    console.log(JSON.stringify(await res1.json(), null, 2));

    // Wait for the profile trigger to complete profile creation
    await new Promise(r => setTimeout(r, 1000));

    // 2. KYC Complete (Profile Verified)
    const { error: err2 } = await supabaseAdmin.from('profiles').update({ verified: true }).eq('id', user.id);
    if (err2) throw err2;
    const { data: prof2 } = await supabaseAdmin.from('profiles').select('verified').eq('id', user.id).single();
    if (!prof2 || !prof2.verified) throw new Error(`Profile not verified in DB! ${JSON.stringify(prof2)}`);
    await checkStatus('2. KYC Complete');

    // 3. QUALIFICATION Incomplete (Only RESIDENCE)
    const { error: err3 } = await supabaseAdmin.from('verifications').insert({
        user_id: user.id,
        type: 'RESIDENCE',
        status: 'VERIFIED'
    });
    if (err3) throw err3;
    await checkStatus('3. QUALIFICATION Incomplete (1 Pillar)');

    // 4. QUALIFICATION Complete (3 Pillars)
    const { error: err4 } = await supabaseAdmin.from('verifications').insert([
        { user_id: user.id, type: 'PHYSICAL', status: 'VERIFIED' },
        { user_id: user.id, type: 'CAREER', status: 'VERIFIED' }
    ]);
    if (err4) throw err4;
    await checkStatus('4. QUALIFICATION Complete (3 Pillars)');

    // 5. Banned User
    const { error: err5 } = await supabaseAdmin.from('profiles').update({ banned: true }).eq('id', user.id);
    if (err5) throw err5;
    await checkStatus('5. Banned User');

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    console.log("\\n✅ Smoke test completed and user cleaned up.");
}

runTest().catch(console.error);
