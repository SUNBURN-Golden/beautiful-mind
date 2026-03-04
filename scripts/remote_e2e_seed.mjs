import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try loading from test env first, then local
dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: 'apps/web/.env.test.local' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// FAIL-FAST GUARD: Only allow running against project 'cjmn' (E2E project)
const ALLOWED_PROJECT_REF = 'cjmnidnjbnfvqlzmekmc';
if (!supabaseUrl || !supabaseUrl.includes(ALLOWED_PROJECT_REF)) {
    console.error(`❌ CRITICAL ERROR: This script is restricted to the E2E project (${ALLOWED_PROJECT_REF}).`);
    console.error(`Current URL: ${supabaseUrl || 'NOT_FOUND'}`);
    process.exit(1);
}

if (!supabaseServiceKey) {
    console.error('Missing Supabase Service Role Key.');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function seedRemoteE2EUser() {
    console.log('🌱 [1/2] Provisioning Remote E2E User...');

    const email = `e2e-tester-${Date.now()}@example.com`;
    const password = 'extremely-secure-password-123';

    // 1. Create Auth User
    const { data: userData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (authErr) throw new Error(`Auth Prov Fail: ${authErr.message}`);
    const user_id = userData.user.id;
    console.log(`   ✅ User created: ${user_id}`);

    // 2. Create Profile row (Must exist for SSOT and GuardedLayout)
    const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: user_id,
            display_name: 'E2E Tester',
            email: email,
            verified: true // Pre-verify KYC to speed up test
        });

    if (profileErr) throw new Error(`Profile Seed Fail: ${profileErr.message}`);
    console.log('   ✅ Profile row created (verified=true).');

    // 3. Seed Verifications (Bypass Qualification)
    const verificationTypes = ['RESIDENCE', 'PHYSICAL', 'CAREER'];
    const { error: vErr } = await supabaseAdmin
        .from('verifications')
        .insert(verificationTypes.map(type => ({
            user_id,
            type,
            status: 'VERIFIED',
            reviewed_at: new Date().toISOString()
        })));

    if (vErr) throw new Error(`Verification Seed Fail: ${vErr.message}`);
    console.log('   ✅ Verifications seeded (RESIDENCE, PHYSICAL, CAREER).');

    // 3.5 Seed Consents (Bypass Consent Hub)
    const modules = ['OSINT', 'LOCATION', 'DEVICE'];
    const { error: consentErr } = await supabaseAdmin
        .from('consents')
        .insert(modules.map(mod => ({
            user_id,
            module: mod,
            is_granted: true,
            granted_at: new Date().toISOString()
        })));

    if (consentErr) {
        console.warn('   ⚠️ Warning: Failed to seed consents:', consentErr.message);
    } else {
        console.log('   ✅ Consents seeded (OSINT, LOCATION, DEVICE).');
    }

    // 4. Seed Interview (IN_PROGRESS) to avoid 404 on finalize
    const { error: interviewErr } = await supabaseAdmin
        .from('interviews')
        .insert({
            user_id,
            status: 'IN_PROGRESS',
            transcript_json: [{ role: 'assistant', content: '안녕하세요. 인터뷰를 시작합니다.' }]
        });

    if (interviewErr) throw new Error(`Interview Seed Fail: ${interviewErr.message}`);
    console.log('   ✅ Interview seeded (IN_PROGRESS).');

    // Save configuration for Playwright
    const creds = { email, password, user_id };
    const e2eDir = path.join(process.cwd(), '.e2e');
    if (!fs.existsSync(e2eDir)) fs.mkdirSync(e2eDir);
    fs.writeFileSync(path.join(e2eDir, 'creds.json'), JSON.stringify(creds, null, 2));

    console.log('   ✅ Credentials saved to `.e2e/creds.json`.');
    console.log('🚀 Remote E2E Seed Complete.');
}

seedRemoteE2EUser().catch(err => {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
});
