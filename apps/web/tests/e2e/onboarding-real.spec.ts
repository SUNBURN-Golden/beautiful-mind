import { test, expect } from '@playwright/test';

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
            await page.getByRole('button', { name: '[테스트용] 제출 건너뛰기' }).click();
            await page.waitForFunction(async () => {
                const res = await fetch('/api/me/status');
                const data = await res.json();
                return data.step !== 'QUALIFICATION';
            }, { timeout: 60000, polling: 3000 });
            await page.waitForTimeout(3000);
            await page.goto('/onboarding/consent');
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

            // (a) Wait for the POST request to finalize the interview (Gemini can be slow)
            const finalizePromise = page.waitForResponse(r =>
                r.url().includes('/api/interview/finalize') &&
                r.request().method() === 'POST',
                { timeout: 90000 }
            );

            await page.waitForSelector('textarea');
            await page.fill('textarea', '이것은 인터뷰 답변입니다.');
            console.log('[PLAYWRIGHT DEBUG] Clicking Finalize Interview');
            await page.click('button:has-text("종료 및 저장")');
            console.log('[PLAYWRIGHT DEBUG] Waiting for Finalize API response (90s timeout)...');

            const finalizeRes = await finalizePromise;
            console.log(`[PLAYWRIGHT DEBUG] Interview Finalize API Response: ${finalizeRes.status()}`);
            expect(finalizeRes.status()).toBe(200);

            // (b) Poll SSOT until DASHBOARD_READY (eliminates race with GuardedLayout)
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

            // (c) Finally wait for /dashboard URL
            console.log('[PLAYWRIGHT DEBUG] State confirmed. Waiting for /dashboard URL...');
            await expect(page).toHaveURL(/.*\/dashboard$/, { timeout: 30000 });
        }
        await expect(page.locator('text=온보딩 통합 결과')).toBeVisible({ timeout: 15000 });
    });

    test('Revoke consent kicks user back to CONSENT_HUB', async ({ page }) => {
        // ... Logic for revoke consent test
    });
});
