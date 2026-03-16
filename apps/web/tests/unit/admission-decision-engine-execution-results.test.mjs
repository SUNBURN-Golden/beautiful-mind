import assert from 'node:assert/strict';
import test from 'node:test';

const {
    buildApproveDecisionResult,
    buildExceptionDecisionResult,
    buildRejectDecisionResult,
    buildResubmitDecisionResult,
} = await import('../../lib/server/admission-decision-engine/execution-results.ts');

test('execution result builders keep decision-specific status/step mapping stable', () => {
    const approve = buildApproveDecisionResult({
        soulCredentialId: 'soul-1',
        exceptionCaseId: null,
        reviewCaseId: 'review-1',
        purgedCount: 4,
    });
    assert.equal(approve.applicationStatus, 'ACTIVE');
    assert.equal(approve.nextStep, 'ACTIVE');
    assert.equal(approve.soulCredentialId, 'soul-1');
    assert.equal(approve.reviewCaseId, 'review-1');
    assert.deepEqual(approve.resubmitDocumentTypes, []);

    const exception = buildExceptionDecisionResult({
        soulCredentialId: null,
        exceptionCaseId: 'exc-1',
        reviewCaseId: 'review-2',
        purgedCount: 2,
    });
    assert.equal(exception.applicationStatus, 'EXCEPTION_REQUIRED');
    assert.equal(exception.nextStep, 'EXCEPTION_REVIEW');
    assert.equal(exception.exceptionCaseId, 'exc-1');
    assert.deepEqual(exception.resubmitDocumentTypes, []);

    const reject = buildRejectDecisionResult({
        soulCredentialId: null,
        exceptionCaseId: null,
        reviewCaseId: 'review-3',
        purgedCount: 1,
    });
    assert.equal(reject.applicationStatus, 'REJECTED');
    assert.equal(reject.nextStep, 'REJECTED');
    assert.equal(reject.reviewCaseId, 'review-3');
    assert.deepEqual(reject.resubmitDocumentTypes, []);

    const resubmit = buildResubmitDecisionResult({
        soulCredentialId: null,
        exceptionCaseId: null,
        reviewCaseId: null,
        purgedCount: 3,
        resubmitDocumentTypes: ['INCOME_CERTIFICATE', 'MARRIAGE_CERTIFICATE'],
    });
    assert.equal(resubmit.applicationStatus, 'RESUBMIT_REQUIRED');
    assert.equal(resubmit.nextStep, 'RESUBMIT_REQUIRED');
    assert.deepEqual(resubmit.resubmitDocumentTypes, ['INCOME_CERTIFICATE', 'MARRIAGE_CERTIFICATE']);
});
