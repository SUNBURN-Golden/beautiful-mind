import { expect, test } from '@playwright/test';

const ACTIVE_ROUTES = ['/dashboard', '/match', '/chat', '/review', '/report', '/revoke'] as const;
const ADMISSION_GUARDED_ROUTES = [
    '/apply',
    '/apply/status',
    '/apply/identity',
    '/apply/consents',
    '/apply/documents',
    '/onboarding/verify',
] as const;

test.describe('ACTIVE Access Control (Unauthenticated)', () => {
    test.use({
        storageState: { cookies: [], origins: [] },
    });

    test('non-active (unauthenticated) user is blocked from active-only routes', async ({ page }) => {
        for (const route of ACTIVE_ROUTES) {
            await page.goto(route);
            await expect(page).toHaveURL(/.*\/login(\?.*)?$/);
        }
    });

    test('guarded admission routes still require login', async ({ page }) => {
        for (const route of ADMISSION_GUARDED_ROUTES) {
            await page.goto(route);
            await expect(page).toHaveURL(/.*\/login(\?.*)?$/);
        }
    });

    test('public entry surfaces remain reachable without auth', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL(/.*\/login(\?.*)?$/);
        await expect(page.getByTestId('login-email')).toBeVisible();
        await expect(page.getByTestId('login-password')).toBeVisible();
        await expect(page.getByTestId('login-submit')).toBeVisible();
        await expect(page.getByRole('link', { name: /Admission 매뉴얼 보기/ })).toBeVisible();

        await page.goto('/manual');
        await expect(page).toHaveURL(/.*\/manual(\?.*)?$/);
        await expect(page.getByRole('heading', { name: 'SoulBound 이용 매뉴얼' })).toBeVisible();
        await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Admission 시작' })).toBeVisible();
    });
});

test.describe('ACTIVE Access + Recovery (Authenticated)', () => {
    test('@auth active user can access key active surfaces', async ({ page }) => {
        await page.goto('/dashboard');
        if (/\/login(\?.*)?$/.test(page.url())) {
            test.skip(true, 'Authenticated storage state is not available in this local environment.');
        }

        const routeChecks: Array<{ route: string; marker: RegExp }> = [
            { route: '/dashboard', marker: /Control Center/ },
            { route: '/match', marker: /Verified Connection Feed/ },
            { route: '/review', marker: /Trust Attestation/ },
        ];

        for (const check of routeChecks) {
            await page.goto(check.route);
            await expect(page).toHaveURL(new RegExp(`${check.route.replace('/', '\\/')}(\\?.*)?$`));
            await expect(page).not.toHaveURL(/.*\/apply\/status$/);
            await expect(page.locator('body')).toContainText(check.marker);
        }
    });

    test('@auth recovery path: active session loss forces re-auth on active routes', async ({ page }) => {
        await page.goto('/dashboard');
        if (/\/login(\?.*)?$/.test(page.url())) {
            test.skip(true, 'Authenticated storage state is not available in this local environment.');
        }

        await expect(page.locator('body')).toContainText(/Control Center/);

        await page.context().clearCookies();
        await page.goto('/match');
        await expect(page).toHaveURL(/.*\/login(\?.*)?$/);
    });
});
