import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.test.local') });
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEB_E2E_DIR = resolve(__dirname, '../apps/web/.e2e');
const LEGACY_ROOT_E2E_DIR = resolve(__dirname, '../.e2e');
const PLAYWRIGHT_AUTH_DIR = resolve(__dirname, '../apps/web/playwright/.auth');

const ALLOWED_PROJECT_REF = 'cjmnidnjbnfvqlzmekmc';
if (!SUPABASE_URL || !SUPABASE_URL.includes(ALLOWED_PROJECT_REF)) {
    console.error(`❌ CRITICAL ERROR: Cleanup restricted to E2E project (${ALLOWED_PROJECT_REF}).`);
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CRED_FILES = [
    resolve(WEB_E2E_DIR, 'creds.auth.core.json'),
    resolve(WEB_E2E_DIR, 'creds.auth.stateful.json'),
    resolve(WEB_E2E_DIR, 'creds.json'),
    resolve(LEGACY_ROOT_E2E_DIR, 'creds.auth.core.json'),
    resolve(LEGACY_ROOT_E2E_DIR, 'creds.auth.stateful.json'),
    resolve(LEGACY_ROOT_E2E_DIR, 'creds.json'),
];

const AUTH_STATE_FILES = [
    resolve(PLAYWRIGHT_AUTH_DIR, 'state.core.json'),
    resolve(PLAYWRIGHT_AUTH_DIR, 'state.stateful.json'),
    resolve(PLAYWRIGHT_AUTH_DIR, 'state.json'),
];

async function readCredFile(credsFile) {
    try {
        const fileContent = await fs.readFile(credsFile, 'utf8');
        return JSON.parse(fileContent);
    } catch {
        return null;
    }
}

async function removeFileIfPresent(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch {
        return false;
    }
}

async function cleanupUser(userId) {
    const { data: caseRows } = await supabaseAdmin
        .from('review_cases')
        .select('id')
        .eq('user_id', userId);

    const reviewCaseIds = (caseRows || []).map((row) => row.id);
    if (reviewCaseIds.length > 0) {
        await supabaseAdmin.from('review_case_events').delete().in('review_case_id', reviewCaseIds);
    }

    await supabaseAdmin.from('review_case_events').delete().eq('actor_user_id', userId);
    await supabaseAdmin.from('review_cases').delete().eq('user_id', userId);
    await supabaseAdmin.from('consent_events').delete().eq('user_id', userId);
    await supabaseAdmin.from('verified_claims').delete().eq('user_id', userId);
    await supabaseAdmin.from('admission_decision_runs').delete().eq('user_id', userId);
    await supabaseAdmin.from('appeals').delete().eq('user_id', userId);
    await supabaseAdmin.from('exception_cases').delete().eq('user_id', userId);
    await supabaseAdmin.from('audit_samples').delete().eq('user_id', userId);
    await supabaseAdmin.from('trust_ledger_events').delete().eq('user_id', userId);
    await supabaseAdmin.from('soul_credentials').delete().eq('user_id', userId);
    await supabaseAdmin.from('admission_document_submissions').delete().eq('user_id', userId);
    await supabaseAdmin.from('admission_applications').delete().eq('user_id', userId);

    await supabaseAdmin.from('identity_claims').delete().eq('user_id', userId);
    await supabaseAdmin.from('verifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('consents').delete().eq('user_id', userId);
    await supabaseAdmin.from('contracts').delete().eq('user_id', userId);
    await supabaseAdmin.from('interviews').delete().eq('user_id', userId);
    await supabaseAdmin.from('sbt_claims').delete().eq('user_id', userId);

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
        if (deleteErr.status === 404 || deleteErr.code === 'user_not_found') {
            console.log(`   ✅ User ${userId} was already deleted.`);
            return true;
        }

        console.warn(`⚠️ Hard delete failed for e2e user ${userId}, retrying soft delete:`, deleteErr);

        const { error: softDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId, true);
        if (softDeleteErr) {
            if (softDeleteErr.status === 404 || softDeleteErr.code === 'user_not_found') {
                console.log(`   ✅ User ${userId} was already deleted.`);
                return true;
            }
            console.warn(`⚠️ Soft delete also failed for e2e user ${userId} (continuing):`, softDeleteErr);
            return false;
        }

        console.log(`   ✅ Soft-deleted user ${userId} after hard delete fallback.`);
        return true;
    }

    console.log(`   ✅ Deleted user ${userId} and linked state.`);
    return true;
}

async function cleanupRemote() {
    console.log('🧹 [1/1] Cleaning up Remote E2E users and auth state...');

    const credsList = await Promise.all(CRED_FILES.map(readCredFile));
    const userIds = [...new Set(credsList.map((creds) => creds?.user_id).filter(Boolean))];

    if (userIds.length === 0) {
        console.log('   ✅ No lane credentials found. Cleaning local auth state only.');
    }

    const failedUserIds = [];
    for (const userId of userIds) {
        const deleted = await cleanupUser(userId);
        if (!deleted) {
            failedUserIds.push(userId);
        }
    }

    if (failedUserIds.length === 0) {
        for (const credsFile of CRED_FILES) {
            const removed = await removeFileIfPresent(credsFile);
            if (removed) {
                console.log(`   ✅ Removed credentials file: ${credsFile}`);
            }
        }
    } else {
        console.warn(`⚠️ Preserving credentials because cleanup failed for: ${failedUserIds.join(', ')}`);
    }

    for (const authStateFile of AUTH_STATE_FILES) {
        const removed = await removeFileIfPresent(authStateFile);
        if (removed) {
            console.log(`   ✅ Removed auth state file: ${authStateFile}`);
        }
    }

    console.log('🚀 Remote E2E Cleanup Complete.');

    if (failedUserIds.length > 0) {
        process.exitCode = 1;
    }
}

cleanupRemote();
