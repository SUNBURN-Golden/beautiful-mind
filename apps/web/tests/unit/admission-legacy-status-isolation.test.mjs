import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..');

const LEGACY_STATUS_SYMBOLS = [
    'calculateUserStatus',
    'calculateTierScore',
    'OnboardingStatus',
    'updateUserStatus',
    'updateTierScore',
];

function walkFiles(dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory() && ['node_modules', '.next', 'playwright-report', 'test-results'].includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, out);
            continue;
        }

        if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
            continue;
        }

        out.push(fullPath);
    }

    return out;
}

test('legacy onboarding status action was removed from web app', () => {
    const actionPath = path.join(WEB_ROOT, 'app/actions/userStatus.ts');
    assert.equal(fs.existsSync(actionPath), false);
});

test('core package no longer exports obsolete onboarding status model', () => {
    const statusModulePath = path.join(REPO_ROOT, 'packages/core/src/status.ts');
    assert.equal(fs.existsSync(statusModulePath), false);

    const coreIndexPath = path.join(REPO_ROOT, 'packages/core/src/index.ts');
    const coreIndexSource = fs.readFileSync(coreIndexPath, 'utf8');
    assert.equal(coreIndexSource.includes("export * from './status'"), false);
});

test('admission-first web flow has no dependency on legacy status symbols', () => {
    const sourceRoots = [
        path.join(WEB_ROOT, 'app'),
        path.join(WEB_ROOT, 'lib'),
        path.join(WEB_ROOT, 'components'),
    ];

    const sourceFiles = sourceRoots.flatMap((root) => walkFiles(root));

    for (const filePath of sourceFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        for (const symbol of LEGACY_STATUS_SYMBOLS) {
            assert.equal(
                source.includes(symbol),
                false,
                `Found legacy symbol "${symbol}" in ${filePath}`
            );
        }
    }
});

