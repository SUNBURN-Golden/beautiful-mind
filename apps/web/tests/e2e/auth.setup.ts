import { expect, test as setup, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

type AuthLane = 'core' | 'stateful';
const LOGIN_URL_RE = /.*\/login(\?.*)?$/;
const LOGIN_READY_TIMEOUT = 20000;
const LOGIN_READY_ATTEMPTS = 2;

function resolveAuthLane(projectName: string): AuthLane {
    if (projectName.includes('core')) return 'core';
    if (projectName.includes('stateful')) return 'stateful';
    throw new Error(`[E2E_AUTH_LANE_UNKNOWN] Unsupported auth setup project: ${projectName}`);
}

function resolveLanePaths(lane: AuthLane) {
    const suffix = lane === 'core' ? 'core' : 'stateful';
    return {
        authFile: `playwright/.auth/state.${suffix}.json`,
        credsPath: path.resolve(__dirname, `../../.e2e/creds.auth.${suffix}.json`),
    };
}

function loadLocalCreds(projectName: string) {
    const lane = resolveAuthLane(projectName);
    const { authFile, credsPath } = resolveLanePaths(lane);

    if (!fs.existsSync(credsPath)) {
        throw new Error(
            [
                '[E2E_AUTH_CREDS_MISSING] Missing local auth credentials.',
                `Expected file: ${credsPath}`,
                'Run scripts/remote_e2e_seed.mjs or create lane-specific creds manually.',
                'Required files: .e2e/creds.auth.core.json and .e2e/creds.auth.stateful.json',
            ].join('\n'),
        );
    }

    const credsData = fs.readFileSync(credsPath, 'utf8');
    const parsed = JSON.parse(credsData) as { email?: string; password?: string };
    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    const password = typeof parsed.password === 'string' ? parsed.password : '';

    if (!email || !password) {
        throw new Error(
            [
                '[E2E_AUTH_CREDS_INVALID] creds.json is missing required fields.',
                `Expected file: ${credsPath}`,
                'Required shape: {"email":"...","password":"..."}',
            ].join('\n'),
        );
    }

    return { authFile, email, password };
}

async function waitForLoginFormReady(page: Page) {
    await expect(page).toHaveURL(LOGIN_URL_RE, { timeout: LOGIN_READY_TIMEOUT });
    await expect(page.getByTestId('login-email')).toBeEditable({ timeout: LOGIN_READY_TIMEOUT });
    await expect(page.getByTestId('login-password')).toBeEditable({ timeout: LOGIN_READY_TIMEOUT });
    await expect(page.getByTestId('login-submit')).toBeEnabled({ timeout: LOGIN_READY_TIMEOUT });
}

async function navigateToLoginForm(page: Page) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= LOGIN_READY_ATTEMPTS; attempt += 1) {
        try {
            await page.goto('/login', { waitUntil: 'domcontentloaded' });
            await waitForLoginFormReady(page);
            return;
        } catch (error) {
            lastError = error;
            if (attempt === LOGIN_READY_ATTEMPTS) break;
            await page.waitForTimeout(1000);
        }
    }

    const detail = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
        [
            '[E2E_AUTH_LOGIN_READY_TIMEOUT] Login form did not become ready during auth setup.',
            `Last URL: ${page.url()}`,
            detail,
        ].join('\n'),
    );
}

setup('authenticate', async ({ page }, testInfo) => {
    const { authFile, email, password } = loadLocalCreds(testInfo.project.name);

    await navigateToLoginForm(page);
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await Promise.all([
        page.waitForURL(/.*\/(apply\/status|dashboard)(\?.*)?$/, { timeout: 60000 }),
        page.getByTestId('login-submit').click({ force: true }),
    ]);

    await page.context().storageState({ path: authFile });
});
