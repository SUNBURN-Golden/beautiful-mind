import assert from 'node:assert/strict';
import test from 'node:test';

const webStatusCodes = await import('../../lib/contracts/status-codes.ts');
const coreStatusCodes = await import('@soulbound/core/contracts/status-codes');
const webStatusReasons = await import('../../lib/contracts/status-reasons.ts');
const coreStatusReasons = await import('@soulbound/core/contracts/status-reasons');
const webStatusStages = await import('../../lib/contracts/status-stages.ts');
const coreStatusStages = await import('@soulbound/core/contracts/status-stages');

test('web status-code module is a thin shared-boundary re-export from core', () => {
    assert.equal(webStatusCodes.STATUS_BLOCKER_CODES, coreStatusCodes.STATUS_BLOCKER_CODES);
    assert.equal(webStatusCodes.isStatusBlockerCode, coreStatusCodes.isStatusBlockerCode);
});

test('web status-stage module is a thin shared-boundary re-export from core', () => {
    assert.equal(webStatusStages.ADMISSION_STAGES, coreStatusStages.ADMISSION_STAGES);
    assert.equal(webStatusStages.normalizeAdmissionStage, coreStatusStages.normalizeAdmissionStage);
});

test('web status-reason module is a thin shared-boundary re-export from core', () => {
    assert.equal(webStatusReasons.STATUS_DECISION_REASON_CODES, coreStatusReasons.STATUS_DECISION_REASON_CODES);
    assert.equal(webStatusReasons.isStatusDecisionReasonCode, coreStatusReasons.isStatusDecisionReasonCode);
});

test('shared status blocker codes retain representative contract values', () => {
    assert.equal(coreStatusCodes.STATUS_BLOCKER_CODES.IDENTITY_REQUIRED, 'IDENTITY_REQUIRED');
    assert.equal(coreStatusCodes.STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED, 'RESUBMISSION_REQUIRED');
    assert.equal(coreStatusCodes.isStatusBlockerCode('ACCOUNT_FROZEN'), true);
    assert.equal(coreStatusCodes.isStatusBlockerCode('UNKNOWN_BLOCKER'), false);
});

test('shared status stages normalize legacy aliases only at compatibility boundaries', () => {
    assert.equal(coreStatusStages.ADMISSION_STAGES.AI_DECISION, 'AI_DECISION');
    assert.equal(coreStatusStages.normalizeAdmissionStage(coreStatusStages.LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW), 'AI_DECISION');
    assert.equal(coreStatusStages.normalizeAdmissionStage('UNKNOWN_STAGE'), null);
});

test('shared status reasons retain representative contract values', () => {
    assert.equal(coreStatusReasons.STATUS_DECISION_REASON_CODES.PRECONDITION_INCOMPLETE, 'PRECONDITION_INCOMPLETE');
    assert.equal(coreStatusReasons.STATUS_DECISION_REASON_CODES.AI_RULES_APPROVED, 'AI_RULES_APPROVED');
    assert.equal(coreStatusReasons.isStatusDecisionReasonCode('DOCUMENT_REJECTED'), true);
    assert.equal(coreStatusReasons.isStatusDecisionReasonCode('UNKNOWN_REASON'), false);
});
