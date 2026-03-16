import test from 'node:test';
import assert from 'node:assert/strict';

const { ADMISSION_POLICY_VERSION: sharedPolicyVersion } = await import('../../lib/admission-policy.ts');
const { ADMISSION_POLICY_VERSION: admissionPolicyVersion } = await import('../../lib/server/admission.ts');
const { evaluateAdmissionPolicy } = await import('../../lib/server/admission-policy.ts');

const thresholds = {
    aiConfidenceFloor: 0.68,
    exceptionConfidenceFloor: 0.45,
    hardRejectConfidenceCeiling: 0.2,
    auditSampleRate: 0.05,
};

test('admission policy version is sourced from one shared constant', () => {
    assert.equal(admissionPolicyVersion, sharedPolicyVersion);
});

test('policy evaluator uses canonical policy version by default', () => {
    const result = evaluateAdmissionPolicy([], thresholds);
    assert.equal(result.policyVersion, sharedPolicyVersion);
});
