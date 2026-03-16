import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Canonical local unit-test runner for apps/web.
// - deterministic test file ordering
// - explicit TypeScript stripping for .ts imports used by .mjs tests
// - suppresses noisy MODULE_TYPELESS_PACKAGE_JSON warnings in this package
const WEB_ROOT = process.cwd();
const UNIT_DIR = path.join(WEB_ROOT, 'tests', 'unit');

const testFiles = fs
    .readdirSync(UNIT_DIR)
    .filter((file) => file.endsWith('.test.mjs'))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => path.join('tests', 'unit', file));

if (testFiles.length === 0) {
    console.error('[test:unit] No test files found in tests/unit/*.test.mjs');
    process.exit(1);
}

const nodeArgs = [
    '--test',
    '--experimental-strip-types',
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    ...testFiles,
];

const result = spawnSync(process.execPath, nodeArgs, {
    cwd: WEB_ROOT,
    stdio: 'inherit',
    env: process.env,
});

if (typeof result.status === 'number') {
    process.exit(result.status);
}

process.exit(1);
