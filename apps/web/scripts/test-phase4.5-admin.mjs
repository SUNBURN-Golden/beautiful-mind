import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devSecret = process.env.DEV_BACKDOOR_SECRET;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runAdminTest() {
    console.log("🚀 Starting Phase 4.5 Admin Control Plane Smoke Test\\n");

    const email = `admin_phase45_${Date.now()}@example.com`;
    const password = 'AdminPassword123!';

    const { data: { user }, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (createErr) throw createErr;

    // Seed profile and force is_admin = true
    const { error: seedErr } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email: email,
        is_admin: true
    });
    if (seedErr) throw seedErr;

    // Sign in to get JWT
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { session }, error: signinErr } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (signinErr) throw signinErr;

    const token = session.access_token;

    async function callAdminApi(endpoint, body = null, headers = {}) {
        const url = `http://localhost:3000${endpoint}`;
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...headers
            }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        const text = await res.text();
        return { status: res.status, text };
    }

    // 1. Registry Upsert
    console.log("--- 1. Registry Upsert ---");
    const res1 = await callAdminApi('/api/admin/zk/registry/upsert', {
        event_type: 'TEST_EVENT',
        circuit_id: 'TEST_CIRCUIT_V1',
        public_inputs_schema_version: 1,
        enabled: false
    });
    console.log(`Status: ${res1.status}`);
    console.log(JSON.stringify(JSON.parse(res1.text), null, 2));

    // 2. Registry Toggle
    console.log("\\n--- 2. Registry Toggle ---");
    const res2 = await callAdminApi('/api/admin/zk/registry/toggle', {
        event_type: 'TEST_EVENT',
        enabled: true
    });
    console.log(`Status: ${res2.status}`);
    console.log(JSON.stringify(JSON.parse(res2.text), null, 2));

    // 3. Snapshot
    console.log("\\n--- 3. Snapshot ---");
    const res3 = await callAdminApi('/api/admin/zk/snapshot');
    console.log(`Status: ${res3.status}`);
    console.log(JSON.stringify(JSON.parse(res3.text), null, 2));

    // 4. Reset (PROD Simulation)
    console.log("\\n--- 4. Reset (PROD Simulation) ---");
    const res4 = await callAdminApi('/api/admin/zk/reset');
    console.log(`Status: ${res4.status}`);
    console.log(JSON.stringify(JSON.parse(res4.text), null, 2));

    // 5. Reset (DEV Success)
    console.log("\\n--- 5. Reset (DEV Success) ---");
    const res5 = await callAdminApi('/api/admin/zk/reset', null, { 'x-dev-secret': devSecret });
    console.log(`Status: ${res5.status}`);
    console.log(JSON.stringify(JSON.parse(res5.text), null, 2));

    // 6. DB Audit Logs Check
    console.log("\\n--- 6. Audit Logs Query ---");
    const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('action, table_name, new_data, changed_by')
        .eq('changed_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(JSON.stringify(auditLogs, null, 2));

    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    console.log("\\n✅ Smoke test completed and user cleaned up.");
}

runAdminTest().catch(console.error);
