import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = path.resolve(process.cwd());

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('guarded layout wraps protected routes with the common guarded shell', () => {
    const layout = read('app/(guarded)/layout.tsx');

    assert.match(layout, /import \{ GuardedShell \}/);
    assert.match(layout, /<SsotRouteGuard \/>/);
    assert.match(layout, /<GuardedShell>\{children\}<\/GuardedShell>/);
    assert.match(layout, /<Suspense/);
});

test('guarded shell keeps locale switcher, sign out, and disabled nav explicit', () => {
    const shell = read('components/shell/guarded-shell.tsx');

    assert.match(shell, /LocaleSwitch/);
    assert.match(shell, /useStatus\(\{ redirectOnUnauthorized: false \}\)/);
    assert.match(shell, /currentStage !== ADMISSION_STAGES\.ACTIVE/);
    assert.match(shell, /createClient\(\)/);
    assert.match(shell, /supabase\.auth\.signOut\(\)/);
    assert.match(shell, /formatActionLabel\('SIGN_OUT', locale\)/);
    assert.match(shell, /aria-disabled="true"/);
    assert.match(shell, /withLangQuery\('\/dashboard', locale, LIVE_DEFAULT_LOCALE\)/);
    assert.match(shell, /withLangQuery\('\/wallet', locale, LIVE_DEFAULT_LOCALE\)/);
    assert.match(shell, /withLangQuery\('\/apply\/status', locale, LIVE_DEFAULT_LOCALE\)/);
    assert.doesNotMatch(shell, /href: withLangQuery\('\/match'/);
    assert.doesNotMatch(shell, /href: withLangQuery\('\/chat'/);
    assert.doesNotMatch(shell, /href: withLangQuery\('\/review'/);
    assert.doesNotMatch(shell, /href: withLangQuery\('\/report'/);
    assert.doesNotMatch(shell, /href: withLangQuery\('\/revoke'/);
});

test('guarded shell copy includes bilingual unavailable reasons', () => {
    const copy = read('i18n/guarded-shell.ts');

    assert.match(copy, /Not open yet/);
    assert.match(copy, /아직 열리지 않음/);
    assert.match(copy, /Designed for safety\./);
    assert.match(copy, /안전 기반 커뮤니티/);
    assert.match(copy, /Review status/);
    assert.match(copy, /심사 현황/);
    assert.doesNotMatch(copy, /My access/);
    assert.doesNotMatch(copy, /내 입장/);
});
