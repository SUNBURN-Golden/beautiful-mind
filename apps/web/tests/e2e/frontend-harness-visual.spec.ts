import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const VIEWPORTS = [
    { id: 'desktop', width: 1440, height: 900 },
    { id: 'mobile', width: 390, height: 844 },
] as const;

const FIXTURE_ROUTES = [
    { surface: 'landing', state: 'default', url: '/manual/fixtures/landing' },
    { surface: 'dashboard', state: 'loading', url: '/manual/fixtures/dashboard/loading' },
    { surface: 'dashboard', state: 'non_active_gate', url: '/manual/fixtures/dashboard/non-active' },
    { surface: 'dashboard', state: 'active', url: '/manual/fixtures/dashboard/active' },
    { surface: 'match', state: 'status_loading', url: '/manual/fixtures/match/status-loading' },
    { surface: 'match', state: 'non_active_gate', url: '/manual/fixtures/match/non-active' },
    { surface: 'match', state: 'ready_empty', url: '/manual/fixtures/match/ready-empty' },
    { surface: 'match', state: 'ready_error', url: '/manual/fixtures/match/ready-error' },
    { surface: 'match', state: 'ready_populated', url: '/manual/fixtures/match/ready-populated' },
] as const;

async function openFixture(page: Page, url: string) {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible();
    await page.evaluate(async () => {
        if ('fonts' in document) {
            await document.fonts.ready;
        }
    });
}

for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.id} fixture baselines`, () => {
        test.use({
            viewport: {
                width: viewport.width,
                height: viewport.height,
            },
        });

        for (const fixture of FIXTURE_ROUTES) {
            test(`${fixture.surface}:${fixture.state}`, async ({ page }) => {
                await openFixture(page, fixture.url);
                await expect(page).toHaveScreenshot(
                    `${fixture.surface}-${fixture.state}-${viewport.id}.png`,
                    {
                        fullPage: true,
                        animations: 'disabled',
                        caret: 'hide',
                    },
                );
            });
        }
    });
}
