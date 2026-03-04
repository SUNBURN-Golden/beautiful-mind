import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: '.env.local' });

type E2ECreds = {
    user_id: string;
};

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

function readE2ECreds(): E2ECreds {
    const credsPath = path.resolve(process.cwd(), '.e2e/creds.json');
    const raw = fs.readFileSync(credsPath, 'utf8');
    return JSON.parse(raw) as E2ECreds;
}

async function ensureDashboardReadyState(userId: string) {
    const admin = getAdminClient();
    const nowIso = new Date().toISOString();

    await admin
        .from('feature_flags')
        .upsert([
            { flag_key: 'COLLATERAL_REQUIRED_ON_SIGNUP', enabled: false },
            { flag_key: 'COLLATERAL_REQUIRED_FOR_HIGH_TRUST', enabled: false }
        ], { onConflict: 'flag_key' });

    await admin
        .from('profiles')
        .update({
            verified: true,
            banned: false,
            is_frozen: false,
            freeze_reason: null,
            freeze_updated_at: nowIso
        })
        .eq('id', userId);

    const requiredVerificationTypes = ['RESIDENCE', 'PHYSICAL', 'CAREER'];
    const { data: verifiedDocs } = await admin
        .from('verifications')
        .select('type')
        .eq('user_id', userId)
        .eq('status', 'VERIFIED');

    const existingTypes = new Set((verifiedDocs || []).map((row) => row.type));
    const missingTypes = requiredVerificationTypes.filter((type) => !existingTypes.has(type));

    if (missingTypes.length > 0) {
        await admin
            .from('verifications')
            .insert(missingTypes.map((type) => ({
                user_id: userId,
                type,
                status: 'VERIFIED',
                reviewed_at: nowIso
            })));
    }

    const modules = ['OSINT', 'LOCATION', 'DEVICE'];
    await admin
        .from('consents')
        .upsert(
            modules.map((module) => ({
                user_id: userId,
                module,
                is_granted: true,
                granted_at: nowIso,
                terms_accepted: true,
                privacy_accepted: true,
                deep_profiling: true
            })),
            { onConflict: 'user_id,module' }
        );

    const { data: existingContract } = await admin
        .from('contracts')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    if (!existingContract) {
        await admin
            .from('contracts')
            .insert({
                user_id: userId,
                signature_base64: 'e2e-signature',
                agreed_to_terms: true
            });
    }

    const { data: latestInterview } = await admin
        .from('interviews')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestInterview) {
        await admin
            .from('interviews')
            .update({
                status: 'DONE',
                decision: 'PASS',
                score: 95,
                absolute_score: 95,
                summary: 'E2E ready'
            })
            .eq('id', latestInterview.id);
    } else {
        await admin
            .from('interviews')
            .insert({
                user_id: userId,
                status: 'DONE',
                decision: 'PASS',
                score: 95,
                absolute_score: 95,
                summary: 'E2E ready',
                transcript_json: []
            });
    }
}

// These tests require a local environment with the seed script executed beforehand so the DB state matches expectations.

test.describe('Unauthenticated Flow', () => {
    // Override storageState to run without the auth context
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Unauthorized access and random URL redirect', async ({ page }) => {
        // Unauthenticated user going to a random protected page
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/login$/);

        // Unauthenticated user going to KYC page
        await page.goto('/onboarding/verify');
        await expect(page).toHaveURL(/.*\/login$/);
    });
});

test.describe('Real E2E Onboarding Flow (Local Backend Integration)', () => {

    test('Complete Flow: KYC -> Qual -> Consent -> Sign -> Interview', async ({ page }) => {

        // We are already authenticated via auth.setup.ts.
        // The GuardedLayout will push us to the current stage (E_SIGN because of deep seeded state)
        await page.goto('/onboarding/verify');

        // 1. Determine starting stage from backend SSOT
        const statusRes = await page.evaluate(async () => {
            const res = await fetch('/api/me/status');
            return res.json();
        });
        console.log(`[PLAYWRIGHT DEBUG] Starting at stage: ${statusRes.step}`);

        // 2. Navigation & interaction based on current SSOT step
        if (statusRes.step === 'KYC') {
            await expect(page).toHaveURL(/.*\/onboarding\/verify$/);
            await page.getByPlaceholder('홍길동').fill('테스터');
            await page.getByPlaceholder('010-0000-0000').fill('010-0000-0000');
            await page.getByRole('button', { name: '인증 시작' }).click();
            await expect(page).toHaveURL(/.*\/onboarding\/qualification$/, { timeout: 15000 });
        } else if (statusRes.step === 'QUALIFICATION') {
            await expect(page).toHaveURL(/.*\/onboarding\/qualification$/, { timeout: 15000 });
        } else if (statusRes.step === 'CONSENT_HUB') {
            await expect(page).toHaveURL(/.*\/onboarding\/consent$/, { timeout: 15000 });
        } else if (statusRes.step === 'E_SIGN') {
            await expect(page).toHaveURL(/.*\/onboarding\/sign$/, { timeout: 15000 });
        } else {
            // Already at interview or dashboard
            await page.goto('/onboarding/verify'); // Trigger redirect
        }

        // 3. Complete Qualification if present
        if (page.url().includes('qualification')) {
            await page.setInputFiles('input[type="file"]', {
                name: 'qualification-proof.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('qualification-proof'),
            });
            await page.getByRole('button', { name: '서류 제출' }).click();

            await expect.poll(async () => {
                const res = await page.evaluate(async () => {
                    const r = await fetch('/api/me/status');
                    return r.json();
                });
                return res.step;
            }, {
                timeout: 60000,
                intervals: [1000, 2000, 5000]
            }).not.toBe('QUALIFICATION');

            await page.waitForLoadState('networkidle');
        }

        // 4. Complete Consent if present
        if (page.url().includes('consent')) {
            const checkbox1 = page.locator('input[type="checkbox"]').nth(0);
            const checkbox2 = page.locator('input[type="checkbox"]').nth(1);
            await checkbox1.check();
            await checkbox2.check();
            await page.click('button:has-text("동의하고 넘어가기")');
            await expect(page).toHaveURL(/.*\/onboarding\/sign$/, { timeout: 30000 });
        }

        // 5. Signature Phase
        if (page.url().includes('sign')) {
            console.log('[PLAYWRIGHT DEBUG] In Signature Phase');

            // Set up listener for the signature API
            const responsePromise = page.waitForResponse(response =>
                response.url().includes('/api/contract/sign') &&
                response.request().method() === 'POST',
                { timeout: 30000 }
            );

            // Trigger signature mock
            await page.click('button:has-text("서명 인식 테스트")');

            // Wait for submit button to be enabled
            const submitBtn = page.getByRole('button', { name: '서명 제출' });
            await expect(submitBtn).toBeEnabled({ timeout: 10000 });

            console.log('[PLAYWRIGHT DEBUG] Clicking submit signature');
            await submitBtn.click();

            const response = await responsePromise;
            console.log(`[PLAYWRIGHT DEBUG] Signature API Response: ${response.status()}`);
            expect(response.status()).toBe(200);

            // (b) Poll SSOT until state is confirmed (eliminates race with GuardedLayout)
            console.log('[PLAYWRIGHT DEBUG] Polling for AI_INTERVIEW state...');
            await expect.poll(async () => {
                const res = await page.evaluate(async () => {
                    const r = await fetch('/api/me/status');
                    return r.json();
                });
                console.log(`[PLAYWRIGHT DEBUG] Current Polled Step: ${res.step}`);
                return res.step;
            }, {
                timeout: 60000,
                intervals: [1000, 2000, 5000]
            }).toBe('AI_INTERVIEW');

            // (c) Now wait for the URL to follow the confirmed state
            console.log('[PLAYWRIGHT DEBUG] State confirmed. Waiting for /interview URL...');
            await expect(page).toHaveURL(/.*\/interview$/, { timeout: 30000 });
        }

        // 6. Interview Phase
        if (page.url().includes('interview')) {
            console.log('[PLAYWRIGHT DEBUG] In Interview Phase');

            // (a) Submit iterative answers until finalize button appears.
            const answerInput = page.getByPlaceholder('답변을 입력해주세요...');
            const finalizeButton = page.getByRole('button', { name: '인터뷰 완료 및 제출' });

            await expect(answerInput).toBeVisible({ timeout: 30000 });
            for (let i = 0; i < 8; i += 1) {
                if (await finalizeButton.isVisible().catch(() => false)) {
                    break;
                }

                await answerInput.fill(`이것은 인터뷰 답변입니다. #${i + 1}`);
                await page.locator('form button[type="submit"]').click();
                await page.waitForTimeout(1200);
            }

            // (b) Wait for finalize request and submit
            const finalizePromise = page.waitForResponse((r) =>
                r.url().includes('/api/interview/finalize')
                && r.request().method() === 'POST',
                { timeout: 90000 }
            );

            await expect(finalizeButton).toBeVisible({ timeout: 60000 });
            console.log('[PLAYWRIGHT DEBUG] Clicking Finalize Interview');
            await finalizeButton.click();
            console.log('[PLAYWRIGHT DEBUG] Waiting for Finalize API response (90s timeout)...');

            const finalizeRes = await finalizePromise;
            console.log(`[PLAYWRIGHT DEBUG] Interview Finalize API Response: ${finalizeRes.status()}`);
            expect(finalizeRes.status()).toBe(200);

            // (c) Poll SSOT until DASHBOARD_READY (eliminates race with GuardedLayout)
            console.log('[PLAYWRIGHT DEBUG] Interview finalized successfully. Polling for DASHBOARD_READY state...');
            await expect.poll(async () => {
                const res = await page.evaluate(async () => {
                    const r = await fetch('/api/me/status');
                    return r.json();
                });
                console.log(`[PLAYWRIGHT DEBUG] Current Polled Step: ${res.step}`);
                return res.step;
            }, {
                timeout: 60000,
                intervals: [1000, 2000, 5000]
            }).toBe('DASHBOARD_READY');

            // (d) Finally wait for /dashboard URL
            console.log('[PLAYWRIGHT DEBUG] State confirmed. Waiting for /dashboard URL...');
            await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 30000 });
        }
        await expect(page.locator('text=온보딩 통합 결과')).toBeVisible({ timeout: 15000 });
    });

    test('Revoke consent kicks user back to CONSENT_HUB', async () => {
        // ... Logic for revoke consent test
    });
});

test.describe('Trust SBT Flow (fcqs-backed)', () => {
    test.describe.configure({ mode: 'serial' });

    test('self-claim -> low-trust issuance -> dashboard reflection', async ({ page }) => {
        const { user_id: userId } = readE2ECreds();
        await ensureDashboardReadyState(userId);

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 30000 });

        const claimType = `income_over_100m_e2e_${Date.now()}`;
        const selfClaimResult = await page.evaluate(async (nextClaimType) => {
            const res = await fetch('/api/sbt/self-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim_type: nextClaimType,
                    claim_payload: { source: 'playwright-e2e' }
                })
            });
            return { status: res.status, body: await res.json() };
        }, claimType);

        expect(selfClaimResult.status).toBe(200);

        await expect.poll(async () => {
            const status = await page.evaluate(async () => {
                const r = await fetch('/api/me/status', { cache: 'no-store' });
                return r.json();
            });
            return {
                trust: status.meta?.trust_level,
                sbt: status.meta?.sbt_status
            };
        }, {
            timeout: 60000,
            intervals: [1000, 2000, 5000]
        }).toEqual({ trust: 'LOW', sbt: 'ACTIVE' });

        await page.reload();
        await expect(page.getByTestId('trust-level-badge')).toHaveText('LOW', { timeout: 10000 });
        await expect(page.getByTestId('sbt-status-badge')).toHaveText('ACTIVE', { timeout: 10000 });
    });

    test('random audit -> freeze -> decide(pass) -> high-trust promotion', async ({ page, request }) => {
        const { user_id: userId } = readE2ECreds();
        await ensureDashboardReadyState(userId);

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 30000 });

        const claimType = `degree_verified_e2e_${Date.now()}`;
        const selfClaimResult = await page.evaluate(async (nextClaimType) => {
            const res = await fetch('/api/sbt/self-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim_type: nextClaimType,
                    claim_payload: { source: 'playwright-e2e' }
                })
            });
            return { status: res.status, body: await res.json() };
        }, claimType);

        expect(selfClaimResult.status).toBe(200);
        const claimId = selfClaimResult.body?.claim?.id as string;
        expect(typeof claimId).toBe('string');

        const cronSecret = process.env.CRON_SECRET || '';
        expect(cronSecret.length).toBeGreaterThan(0);

        const auditOpenRes = await request.post('/api/audit/random/open', {
            headers: { 'x-cron-secret': cronSecret },
            data: {
                subject_user_id: userId,
                claim_id: claimId,
                note: 'E2E random audit open'
            }
        });
        expect(auditOpenRes.status()).toBe(200);
        const auditOpenJson = await auditOpenRes.json();
        const auditId = auditOpenJson.audit_id as string;
        expect(typeof auditId).toBe('string');

        await expect.poll(async () => {
            const status = await page.evaluate(async () => {
                const r = await fetch('/api/me/status', { cache: 'no-store' });
                return r.json();
            });
            return {
                isFrozen: status.meta?.is_frozen === true,
                auditInProgress: status.meta?.audit_in_progress === true
            };
        }, {
            timeout: 60000,
            intervals: [1000, 2000, 5000]
        }).toEqual({ isFrozen: true, auditInProgress: true });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/banned$/, { timeout: 30000 });

        const decideRes = await request.post('/api/audit/decide', {
            headers: { 'x-cron-secret': cronSecret },
            data: {
                audit_id: auditId,
                decision: 'PASS',
                note: 'E2E pass decision'
            }
        });
        expect(decideRes.status()).toBe(200);

        await expect.poll(async () => {
            const status = await page.evaluate(async () => {
                const r = await fetch('/api/me/status', { cache: 'no-store' });
                return r.json();
            });
            return {
                trust: status.meta?.trust_level,
                sbt: status.meta?.sbt_status,
                frozen: status.meta?.is_frozen === true
            };
        }, {
            timeout: 60000,
            intervals: [1000, 2000, 5000]
        }).toEqual({ trust: 'HIGH', sbt: 'ACTIVE', frozen: false });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 30000 });
        await expect(page.getByTestId('trust-level-badge')).toHaveText('HIGH', { timeout: 10000 });
        await expect(page.getByTestId('audit-progress-badge')).toHaveText('NONE', { timeout: 10000 });
    });
});
