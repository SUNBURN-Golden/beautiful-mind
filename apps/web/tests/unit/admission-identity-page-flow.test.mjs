import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('identity page uses provider-session start flow instead of manual verification-id entry', () => {
    const page = read('app/(guarded)/apply/identity/page.tsx');
    const hook = read('app/(guarded)/apply/identity/useIdentitySession.ts');

    assert.match(page, /\/apply\/identity\/callback/);
    assert.match(hook, /startIdentityVerificationSession\(/);
    assert.match(hook, /requestIdentityVerification/);

    assert.doesNotMatch(hook, /verification_2026_xxx/);
    assert.doesNotMatch(hook, /identityVerificationId,\s*setIdentityVerificationId/);
});

test('identity callback page completes verification and refreshes authoritative status', () => {
    const callbackPage = read('app/(guarded)/apply/identity/callback/page.tsx');

    assert.match(callbackPage, /completeIdentityVerificationSession\(/);
    assert.match(callbackPage, /fetch\('\/api\/me\/status'/);
    assert.match(callbackPage, /getExpectedRoute/);
    assert.match(callbackPage, /router\.replace/);
});
