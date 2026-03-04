import { test, expect } from '@playwright/test';

test.describe('E2E Onboarding Flow Wizard (SSOT RouteGuard)', () => {

    test.beforeEach(async ({ page }) => {
        // Intercept and mock Supabase or external APIs as needed.
        // However, the core of our routing is `GET /api/me/status`.
        // We will dynamically mock this endpoint throughout the tests to simulate state shifts.
    });

    test('Happy Path: Complete onboarding progression step by step', async ({ page }) => {
        // 1. Initial State: LOGIN
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: { step: 'LOGIN', completed: false, next: 'KYC', blockers: [], meta: {} },
            });
        });

        // Directly accessing dashboard while LOGIN should kick back to /login
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/login$/);
        await expect(page.locator('h1')).toContainText('접근을 위해 로그인하십시오.');

        // 2. Simulate Login Action -> Shift to KYC
        await page.route('/api/test-login', async (route) => route.fulfill({ status: 200 }));
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'KYC', blockers: ['IDENTITY_UNVERIFIED'] } });
        });

        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button:has-text("계속하기")');

        // SSOT should trigger a redirect to KYC page
        await expect(page).toHaveURL(/.*\/onboarding\/verify$/);
        await expect(page.locator('h1')).toContainText('본인 확인 절차를 진행합니다.');

        // 3. Simulate KYC Action -> Shift to QUALIFICATION 
        // (Here we jump straight to CONSENT for test brevity if QUALIFICATION isn't mocked yet)
        await page.route('/api/verify/complete', async (route) => route.fulfill({ status: 200 }));
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'CONSENT_HUB', blockers: ['TERMS_NOT_ACCEPTED'] } });
        });

        await page.fill('input[type="text"]', '홍길동');
        await page.fill('input[type="tel"]', '010-1234-5678');
        await page.click('button:has-text("인증 시작")');

        // Should arrive at CONSENT_HUB because QUALIFICATION was skipped by server state
        await expect(page).toHaveURL(/.*\/onboarding\/consent$/);

        // 4. Consent Hub -> E_SIGN
        await page.route('/api/mock-db', async (route) => route.fulfill({ status: 200 }));
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'E_SIGN', blockers: ['SIGNATURE_MISSING'] } });
        });

        // Check both consent boxes
        const checkboxes = page.locator('input[type="checkbox"]');
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
        await page.click('button:has-text("동의하고 넘어가기")');

        await expect(page).toHaveURL(/.*\/onboarding\/sign$/);

        // 5. E_SIGN -> AI_INTERVIEW
        await page.route('/api/mock-db', async (route) => route.fulfill({ status: 200 }));
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'AI_INTERVIEW', blockers: ['INTERVIEW_INCOMPLETE'] } });
        });

        // Mock signature touch
        await page.click('text=서명 인식 테스트');
        await page.click('button:has-text("서명 제출")');

        // Should redirect out of sign page (Wait for UI to show toast and then redirect)
        await expect(page.locator('text=전자 서명 영수증이 생성되었습니다.')).toBeVisible();

        // We expect it to try routing to /interview
        await expect(page).toHaveURL(/.*\/interview$/);
    });

    test('Edge Case: Resume from Mid-Onboarding (Backwards Navigation Block)', async ({ page }) => {
        // Stage is already E_SIGN
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'E_SIGN', blockers: ['SIGNATURE_MISSING'] } });
        });

        // Booting the app from root
        await page.goto('/');
        await expect(page).toHaveURL(/.*\/onboarding\/sign$/);

        // Try to manually force-navigate backwards to consent (Simulating user clicking back button)
        await page.goto('/onboarding/consent');

        // The Layout / useStatus will fetch `api/me/status`, see 'E_SIGN', and strictly bounce them back
        await expect(page).toHaveURL(/.*\/onboarding\/sign$/);
    });

    test('Edge Case: Expiration or Unauthorized Drop (401)', async ({ page }) => {
        // While in CONSENT_HUB, the next status poll returns 401
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 401, json: { error: 'AUTH_REQUIRED' } });
        });

        await page.goto('/onboarding/consent');

        // The client should realize the session is dead and kick out to login
        await expect(page).toHaveURL(/.*\/login$/);
    });

    test('Edge Case: Version Mismatch Rejection on Sign (409)', async ({ page }) => {
        // State is E_SIGN
        await page.route('/api/me/status', async (route) => {
            await route.fulfill({ status: 200, json: { step: 'E_SIGN', blockers: ['SIGNATURE_MISSING'] } });
        });

        await page.goto('/onboarding/sign');

        // Simulate clicking signature
        await page.click('text=서명 인식 테스트');

        // Attempt submit, but backend says VERSION_MISMATCH
        await page.route('/api/mock-db', async (route) => {
            await route.fulfill({ status: 409, json: { error: 'VERSION_MISMATCH' } });
        });

        // Intercept window.alert and window.location.reload triggered by UX constraints
        let alertMessage = '';
        page.on('dialog', async (dialog) => {
            alertMessage = dialog.message();
            await dialog.accept();
        });

        await page.click('button:has-text("서명 제출")');

        expect(alertMessage).toContain('버전이 업데이트되었습니다');
    });

});
