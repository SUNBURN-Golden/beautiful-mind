import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('liveness page uses session/capture flow instead of manual confidence payload controls', () => {
    const page = read('app/(guarded)/apply/liveness/page.tsx');
    const hook = read('app/(guarded)/apply/liveness/useLivenessFlow.ts');

    assert.match(hook, /startLivenessVerificationSession\(/);
    assert.match(hook, /completeLivenessVerificationSession\(/);
    assert.match(hook, /navigator\.mediaDevices\.getUserMedia/);
    assert.match(page, /Capture reference/);
    assert.match(page, /Capture hash/);

    assert.doesNotMatch(hook, /provider:\s*'liveness_provider_v1'/);
    assert.doesNotMatch(hook, /confidence:\s*0\.98/);
    assert.doesNotMatch(hook, /media_ref:\s*null/);
});

test('liveness callback page polls result and refreshes authoritative status', () => {
    const callbackPage = read('app/(guarded)/apply/liveness/callback/page.tsx');

    assert.match(callbackPage, /fetchLivenessVerificationSessionResult\(/);
    assert.match(callbackPage, /parseStatusContract/);
    assert.match(callbackPage, /fetch\('\/api\/me\/status'/);
    assert.match(callbackPage, /router\.replace/);
});
