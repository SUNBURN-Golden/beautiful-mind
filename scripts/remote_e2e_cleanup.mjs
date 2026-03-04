import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Prefer .env.test.local for E2E
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.test.local') });
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// FAIL-FAST GUARD: Only allow running against project 'cjmn' (E2E project)
const ALLOWED_PROJECT_REF = 'cjmnidnjbnfvqlzmekmc';
if (!SUPABASE_URL || !SUPABASE_URL.includes(ALLOWED_PROJECT_REF)) {
    console.error(`❌ CRITICAL ERROR: Cleanup restricted to E2E project (${ALLOWED_PROJECT_REF}).`);
    process.exit(1);
}

console.log('Environment variables loaded:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_SERVICE_ROLE_KEY
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

import * as fs from 'fs/promises';

async function cleanupRemote() {
    console.log('🧹 [1/1] Cleaning up Remote E2E User...');

    const credsFile = resolve(__dirname, '../apps/web/.e2e/creds.json');
    let creds;
    try {
        const fileContent = await fs.readFile(credsFile, 'utf8');
        creds = JSON.parse(fileContent);
    } catch (e) {
        console.log('   ✅ No e2e credentials file found. Nothing to clean up.');
        return;
    }

    if (creds && creds.user_id) {
        // 1. Proactively delete linked records to avoid trigger/constraint issues during deletion
        // These tables might have restricted mutations, but service_role should bypass or handle it
        await supabaseAdmin.from('identity_claims').delete().eq('user_id', creds.user_id);
        await supabaseAdmin.from('verifications').delete().eq('user_id', creds.user_id);

        // 2. Delete user
        const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(creds.user_id);
        if (deleteErr) {
            console.error('❌ Failed to delete e2e user:', deleteErr);
            process.exit(1);
        }
        console.log(`   ✅ Deleted user ${creds.user_id} and all cascaded state.`);
    }

    // Clean up file
    try {
        await fs.unlink(credsFile);
        console.log('   ✅ Removed credentials file.');
    } catch (e) { }

    console.log('🚀 Remote E2E Cleanup Complete.');
}

cleanupRemote();
