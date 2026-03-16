import { expect, test } from '@playwright/test';
import { STATUS_BLOCKER_CODES } from '../../lib/contracts/status-codes';
import { ADMISSION_STAGES } from '../../lib/contracts/status-stages';

test.describe('SSOT Route Regression @auth-stateful @auth-simulated', () => {
    test('stage mismatch on dashboard exposes the next-step action', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    stage: ADMISSION_STAGES.CONSENTS,
                    blockers: [STATUS_BLOCKER_CODES.CONSENTS_REQUIRED],
                    meta: { is_frozen: false },
                },
            });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard(\?.*)?$/);
        const transitionLink = page.locator('a[href="/apply/consents"]').first();
        await expect(transitionLink).toBeVisible();
        await expect(transitionLink).toHaveAttribute('href', '/apply/consents');
    });

    test('client-only frozen signal does not override the server-side dashboard route', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    stage: ADMISSION_STAGES.ACTIVE,
                    blockers: [STATUS_BLOCKER_CODES.ACCOUNT_FROZEN],
                    meta: { is_frozen: true },
                },
            });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard(\?.*)?$/);
        await expect(page.getByRole('heading', { name: 'Trust Network Home' })).toBeVisible();
    });

    test('status API failure exits loading state with transition fallback on dashboard', async ({ page }) => {
        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 500,
                json: {
                    error: 'INTERNAL_SERVER_ERROR',
                },
            });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*\/dashboard(\?.*)?$/);
        await expect(page.locator('a[href="/apply"]').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('a[href="/manual"]').first()).toBeVisible();
    });
});
