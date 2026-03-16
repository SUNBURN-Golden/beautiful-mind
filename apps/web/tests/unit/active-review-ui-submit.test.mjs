import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('review UI submit flow uses API-backed trust attestation contract fields', () => {
    const reviewPage = read('app/review/page.tsx');
    const reviewHook = read('app/review/useReviewSubmission.ts');
    const activeContract = read('lib/active-contract.ts');

    assert.match(reviewHook, /submitTrustAttestation\(\{/);
    assert.match(reviewHook, /ackPhrase/);
    assert.match(reviewPage, /Submit Attestation/);

    assert.match(activeContract, /url:\s*'\/api\/active\/review\/submit'/);
    assert.doesNotMatch(activeContract, /source:\s*'ADAPTER'/);
});
