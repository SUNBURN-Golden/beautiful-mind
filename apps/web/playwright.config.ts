import { defineConfig, devices } from '@playwright/test';

const REQUIRE_AUTH_E2E = process.env.PLAYWRIGHT_REQUIRE_AUTH === '1';
const AUTH_CORE_TAG = /@auth\b(?!-stateful|-simulated)/;
const AUTH_STATEFUL_TAG = /@auth-stateful\b/;
const AUTH_ANY_TAG = /@auth(?:-stateful)?\b/;

const projects = REQUIRE_AUTH_E2E
    ? [
        {
            name: 'setup-auth-core',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'setup-auth-stateful',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'chromium-auth-core',
            grep: AUTH_CORE_TAG,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/state.core.json',
            },
            dependencies: ['setup-auth-core'],
        },
        {
            name: 'chromium-auth-stateful',
            grep: AUTH_STATEFUL_TAG,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/state.stateful.json',
            },
            dependencies: ['setup-auth-stateful'],
        },
    ]
    : [
        {
            name: 'chromium',
            grepInvert: AUTH_ANY_TAG,
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ];

export default defineConfig({
    timeout: 120000,
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
    },
    projects,
    webServer: {
        command: 'pnpm exec next start --hostname 127.0.0.1 --port 3000',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        timeout: 120000,
    },
});
