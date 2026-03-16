import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_E2E_DIR = path.resolve(__dirname, '../apps/web/.e2e');

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

const REQUIRED_ADMISSION_TABLES = [
    'admission_applications',
    'admission_document_submissions',
    'consent_events',
    'admission_decision_runs',
    'soul_credentials',
    'trust_ledger_events',
];

const ADMISSION_POLICY_VERSION = 'admission-v1';
const REQUIRED_CONSENT_TYPES = [
    'IDENTITY_HANDLING',
    'LIVENESS_HANDLING',
    'EDUCATION_DOCUMENT_HANDLING',
    'INCOME_DOCUMENT_HANDLING',
    'MARITAL_FAMILY_DOCUMENT_HANDLING',
    'AI_ASSISTED_ANALYSIS',
    'HUMAN_EXCEPTION_AUDIT_APPEAL_REVIEW',
    'IMMEDIATE_PURGE_AND_MINIMAL_RETENTION',
];
const CORE_READY_DOCUMENTS = [
    {
        document_type: 'GRADUATION_CERTIFICATE',
        extracted_claims_json: {
            graduate_verified: true,
            school_name_masked: 'E2E University',
        },
        claim_type: 'GRADUATION_VERIFIED',
        claim_value_normalized: {
            graduate_verified: true,
            school_name_masked: 'E2E University',
        },
    },
    {
        document_type: 'INCOME_CERTIFICATE',
        extracted_claims_json: {
            income_verified: true,
            income_year: 2025,
            income_band: 'MID',
        },
        claim_type: 'INCOME_BAND_VERIFIED',
        claim_value_normalized: {
            income_verified: true,
            income_year: 2025,
            income_band: 'MID',
        },
    },
    {
        document_type: 'MARRIAGE_CERTIFICATE',
        extracted_claims_json: {
            marriage_verified: true,
            marital_status: 'MARRIED',
            divorced_flag: false,
        },
        claim_type: 'MARITAL_STATUS_VERIFIED',
        claim_value_normalized: {
            marriage_verified: true,
            marital_status: 'MARRIED',
            divorced_flag: false,
        },
    },
    {
        document_type: 'FAMILY_RELATION_CERTIFICATE',
        extracted_claims_json: {
            family_relation_verified: true,
            has_children: true,
            children_count_band: '1_2',
        },
        claim_type: 'HAS_CHILDREN_VERIFIED',
        claim_value_normalized: {
            family_relation_verified: true,
            has_children: true,
            children_count_band: '1_2',
        },
    },
];

function isMissingTableError(message = '') {
    return message.includes("Could not find the table")
        || message.includes('does not exist')
        || message.includes('schema cache');
}

function buildSyntheticHash(userId) {
    return userId.replace(/-/g, '').padEnd(64, '0').slice(0, 64);
}

function buildDeterministicHash(...parts) {
    return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
}

async function assertAdmissionSchema() {
    console.log('🔎 [0/2] Validating admission schema...');

    for (const table of REQUIRED_ADMISSION_TABLES) {
        const { error } = await supabaseAdmin
            .from(table)
            .select('id')
            .limit(1);

        if (!error) {
            continue;
        }

        if (isMissingTableError(error.message || '')) {
            throw new Error(
                [
                    `Missing required table "${table}" in cjmn.`,
                    'Apply migrations in order before running remote E2E:',
                    '1) 20260306010000_admission_refactor.sql',
                    '2) 20260307100000_ai_operated_trust_os.sql',
                ].join('\n')
            );
        }

        throw new Error(`Schema check failed for ${table}: ${error.message}`);
    }

    console.log('   ✅ Admission schema looks ready.');
}

async function provisionLaneUser(params) {
    const { lane, email, password, displayName } = params;
    const { data: userData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (authErr) throw new Error(`[${lane}] Auth Prov Fail: ${authErr.message}`);
    const user_id = userData.user.id;
    console.log(`   ✅ [${lane}] User created: ${user_id}`);

    const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: user_id,
            display_name: displayName,
            email,
            verified: false,
            banned: false,
            is_frozen: false,
        });

    if (profileErr) throw new Error(`[${lane}] Profile Seed Fail: ${profileErr.message}`);
    console.log(`   ✅ [${lane}] Profile row created.`);

    return { email, password, user_id };
}

async function seedCoreActiveBaseline(userId, displayName) {
    const nowIso = new Date().toISOString();

    const { error: profilePatchErr } = await supabaseAdmin
        .from('profiles')
        .update({
            verified: true,
            banned: false,
            is_frozen: false,
            freeze_reason: null,
            display_name: displayName,
            birth_year: 1990,
            gender: 'UNSPECIFIED',
        })
        .eq('id', userId);

    if (profilePatchErr) {
        throw new Error(`[core] ACTIVE baseline profile patch failed: ${profilePatchErr.message}`);
    }

    const { data: application, error: applicationErr } = await supabaseAdmin
        .from('admission_applications')
        .insert({
            user_id: userId,
            status: 'ACTIVE',
            current_step: 'ACTIVE',
            policy_version: ADMISSION_POLICY_VERSION,
            submitted_at: nowIso,
            ai_review_started_at: nowIso,
            ai_review_completed_at: nowIso,
            approved_at: nowIso,
            liveness_verified_at: nowIso,
            soul_issued_at: nowIso,
            activated_at: nowIso,
        })
        .select('id')
        .single();

    if (applicationErr || !application) {
        throw new Error(`[core] ACTIVE baseline application seed failed: ${applicationErr?.message || 'missing application id'}`);
    }

    const { error: identityErr } = await supabaseAdmin
        .from('identity_claims')
        .insert({
            user_id: userId,
            name_hash: buildDeterministicHash(userId, 'identity-name'),
            birth_year: 1990,
            gender: 'UNSPECIFIED',
            phone_encrypted: buildDeterministicHash(userId, 'identity-phone'),
            ci_hash: buildDeterministicHash(userId, 'identity-ci'),
            identity_verification_id: `seed-core-${userId}`,
        });

    if (identityErr) {
        throw new Error(`[core] ACTIVE baseline identity claim seed failed: ${identityErr.message}`);
    }

    const { error: consentErr } = await supabaseAdmin
        .from('consent_events')
        .insert(
            REQUIRED_CONSENT_TYPES.map((consentType) => ({
                user_id: userId,
                consent_type: consentType,
                policy_version: ADMISSION_POLICY_VERSION,
                granted_at: nowIso,
                typed_ack_phrase: `I ACKNOWLEDGE ${consentType.replaceAll('_', ' ')}`,
                capture_method: 'e2e_seed',
                audit_reference: `seed:${userId}:${consentType}`,
            })),
        );

    if (consentErr) {
        throw new Error(`[core] ACTIVE baseline consent seed failed: ${consentErr.message}`);
    }

    const { error: documentErr } = await supabaseAdmin
        .from('admission_document_submissions')
        .insert(
            CORE_READY_DOCUMENTS.map((doc) => ({
                admission_application_id: application.id,
                user_id: userId,
                document_type: doc.document_type,
                upload_status: 'PURGED',
                processing_status: 'AI_PASSED',
                final_result: 'VERIFIED',
                ai_result: 'SEED_VERIFIED',
                ai_confidence: 0.99,
                human_result: null,
                extracted_claims_json: doc.extracted_claims_json,
                file_storage_key_ephemeral: null,
                uploaded_at: nowIso,
                processed_at: nowIso,
                purged_at: nowIso,
            })),
        );

    if (documentErr) {
        throw new Error(`[core] ACTIVE baseline document seed failed: ${documentErr.message}`);
    }

    const { error: verifiedClaimsErr } = await supabaseAdmin
        .from('verified_claims')
        .insert([
            {
                user_id: userId,
                claim_type: 'REAL_PERSON_VERIFIED',
                claim_value_normalized: {
                    real_person_verified: true,
                    provider: 'E2E_SEED',
                    confidence: 0.99,
                },
                source_document_type: null,
                verification_method: 'E2E_SEED',
                verification_status: 'VERIFIED',
                verified_at: nowIso,
                policy_version: ADMISSION_POLICY_VERSION,
                attestation_hash: buildDeterministicHash(userId, 'REAL_PERSON_VERIFIED'),
            },
            ...CORE_READY_DOCUMENTS.map((doc) => ({
                user_id: userId,
                claim_type: doc.claim_type,
                claim_value_normalized: doc.claim_value_normalized,
                source_document_type: doc.document_type,
                verification_method: 'E2E_SEED',
                verification_status: 'VERIFIED',
                verified_at: nowIso,
                policy_version: ADMISSION_POLICY_VERSION,
                attestation_hash: buildDeterministicHash(userId, doc.claim_type),
            })),
        ]);

    if (verifiedClaimsErr) {
        throw new Error(`[core] ACTIVE baseline verified claims seed failed: ${verifiedClaimsErr.message}`);
    }

    const { error: soulErr } = await supabaseAdmin
        .from('soul_credentials')
        .insert({
            user_id: userId,
            admission_application_id: application.id,
            credential_type: 'SOUL_TRUST',
            trust_level: 'ADMISSION_VERIFIED',
            status: 'ISSUED',
            issued_at: nowIso,
            revoked_at: null,
            attestation_hash: buildSyntheticHash(userId),
            metadata: {
                issuance_source: 'E2E_SEED',
                lane: 'core',
            },
        });

    if (soulErr) {
        throw new Error(`[core] ACTIVE baseline soul credential seed failed: ${soulErr.message}`);
    }

    console.log('   ✅ [core] ACTIVE-ready baseline seeded: profile verified, identity, consents, documents, claims, application, and soul credential.');
}

async function seedRemoteE2EUsers() {
    await assertAdmissionSchema();
    console.log('🌱 [1/2] Provisioning isolated Remote E2E users...');

    const stamp = Date.now();
    const password = 'extremely-secure-password-123';

    const coreCreds = await provisionLaneUser({
        lane: 'core',
        email: `e2e-auth-core-${stamp}@example.com`,
        password,
        displayName: 'E2E Auth Core',
    });
    await seedCoreActiveBaseline(coreCreds.user_id, 'E2E Auth Core');
    const statefulCreds = await provisionLaneUser({
        lane: 'stateful',
        email: `e2e-auth-stateful-${stamp}@example.com`,
        password,
        displayName: 'E2E Auth Stateful',
    });

    // Save configuration for Playwright
    if (!fs.existsSync(WEB_E2E_DIR)) fs.mkdirSync(WEB_E2E_DIR, { recursive: true });
    fs.writeFileSync(path.join(WEB_E2E_DIR, 'creds.auth.core.json'), JSON.stringify(coreCreds, null, 2));
    fs.writeFileSync(path.join(WEB_E2E_DIR, 'creds.auth.stateful.json'), JSON.stringify(statefulCreds, null, 2));
    // Legacy pointer kept for backward compatibility with tools still reading one credentials file.
    fs.writeFileSync(path.join(WEB_E2E_DIR, 'creds.json'), JSON.stringify(statefulCreds, null, 2));

    console.log('   ✅ Credentials saved to `apps/web/.e2e/creds.auth.core.json` and `apps/web/.e2e/creds.auth.stateful.json`.');
    console.log('🚀 Remote E2E Seed Complete.');
}

seedRemoteE2EUsers().catch((err) => {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
});
