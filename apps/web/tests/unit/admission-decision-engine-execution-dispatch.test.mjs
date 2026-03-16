import assert from 'node:assert/strict';
import test from 'node:test';

const { assertRequiredDocsSatisfied } = await import('../../lib/server/admission-decision-engine/execution-preflight.ts');

test('required-doc preflight guard preserves original execution gating behavior', () => {
    assert.doesNotThrow(() => {
        assertRequiredDocsSatisfied('APPROVE', []);
    });

    assert.doesNotThrow(() => {
        assertRequiredDocsSatisfied('RESUBMIT_REQUIRED', ['INCOME_CERTIFICATE']);
    });

    assert.throws(() => {
        assertRequiredDocsSatisfied('REJECT', ['GRADUATION_CERTIFICATE', 'INCOME_CERTIFICATE']);
    }, /Missing required docs: GRADUATION_CERTIFICATE, INCOME_CERTIFICATE/);
});
