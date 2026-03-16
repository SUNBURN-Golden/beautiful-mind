import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = process.cwd();

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

test('legacy onboarding server actions file is retired', () => {
    const legacyActionPath = path.join(WEB_ROOT, 'app/actions/onboarding.ts');
    assert.equal(fs.existsSync(legacyActionPath), false);
});

test('active admission flow does not import legacy onboarding actions', () => {
    const sourceRoots = [
        path.join(WEB_ROOT, 'app'),
        path.join(WEB_ROOT, 'lib'),
        path.join(WEB_ROOT, 'components'),
    ];

    const sourceFiles = sourceRoots.flatMap((root) => walkFiles(root));
    const forbiddenPatterns = [
        "@/app/actions/onboarding",
        '@/app/actions/onboarding',
        'saveProfile(',
        'saveContract(',
        'saveConsents(',
    ];

    for (const filePath of sourceFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        for (const pattern of forbiddenPatterns) {
            assert.equal(
                source.includes(pattern),
                false,
                `Found retired onboarding action usage "${pattern}" in ${filePath}`
            );
        }
    }
});

