import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/state.json';

setup('authenticate', async ({ page }) => {
    const credsPath = path.resolve(__dirname, '../../.e2e/creds.json');
    const credsData = fs.readFileSync(credsPath, 'utf8');
    const { email, password } = JSON.parse(credsData);

    // Perform login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click({ force: true });

    // Debug: capture state after click
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'playwright-debug-login.png' });

    // Wait for the successful redirect away from login
    // Remote Supabase can be slow, especially with middleware redirects
    await page.waitForURL(/.*\/onboarding.*/, { timeout: 60000 });

    // Save authentication state
    await page.context().storageState({ path: authFile });
});
