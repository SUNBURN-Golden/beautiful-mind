import { expect, test } from '@playwright/test';

test.describe('SSOT Route Regression', () => {
    test('stage mismatch redirects to expected onboarding route', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    step: 'CONSENT_HUB',
                    blockers: ['CONSENT_REQUIRED'],
                    meta: { is_frozen: false },
                },
            });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/onboarding\/consent$/);
    });

    test('frozen users are pinned to banned page', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    step: 'DASHBOARD_READY',
                    blockers: ['ACCOUNT_FROZEN'],
                    meta: { is_frozen: true },
                },
            });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/banned$/);
    });

    test('status API failure exits loading state with transition fallback', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 500,
                json: {
                    error: { code: 'INTERNAL_SERVER_ERROR' },
                },
            });
        });

        await page.goto('/onboarding/verify');
        await expect(page.getByRole('link', { name: '현재 단계로 이동' })).toBeVisible({ timeout: 15_000 });
    });
});
