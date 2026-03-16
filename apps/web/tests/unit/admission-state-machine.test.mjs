import test from 'node:test';
import assert from 'node:assert/strict';

const {
    ADMISSION_STAGES,
    LEGACY_ADMISSION_STAGE_CODES,
} = await import('../../lib/contracts/status-stages.ts');
const { STATUS_BLOCKER_CODES } = await import('../../lib/contracts/status-codes.ts');
const {
    asAdmissionStage,
    deriveAdmissionStage,
} = await import('../../lib/server/admission-state-machine.ts');

test('derive stage -> APPLY_START when application is missing', () => {
    const result = deriveAdmissionStage({
        hasIdentity: false,
        hasLiveness: false,
        consentCompleted: false,
        documentsCompleted: false,
        hasSoulCredential: false,
        application: null,
        hasResubmitRequest: false,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.APPLY_START);
    assert.ok(result.blockers.includes(STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED));
});

test('derive stage -> RESUBMIT_REQUIRED on resubmit state', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'RESUBMIT_REQUIRED',
            current_step: 'RESUBMIT_REQUIRED',
            soul_issued_at: null,
        },
        hasResubmitRequest: true,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.RESUBMIT_REQUIRED);
    assert.ok(result.blockers.includes(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED));
});

test('derive stage -> EXCEPTION_REVIEW when app is in exception state', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'EXCEPTION_REQUIRED',
            current_step: 'EXCEPTION_REVIEW',
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
        hasExceptionCase: true,
    });

    assert.equal(result.stage, ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.ok(result.blockers.includes(STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED));
});

test('derive stage -> APPEAL_PENDING when appeal queue is open', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'APPEAL_PENDING',
            current_step: 'APPEAL_PENDING',
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
        hasAppealOpen: true,
    });

    assert.equal(result.stage, ADMISSION_STAGES.APPEAL_PENDING);
    assert.ok(result.blockers.includes(STATUS_BLOCKER_CODES.APPEAL_PENDING));
});

test('derive stage -> ACTIVE when soul credential issued and app active', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: true,
        application: {
            status: 'ACTIVE',
            current_step: 'ACTIVE',
            soul_issued_at: '2026-03-06T00:00:00.000Z',
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.ACTIVE);
    assert.equal(result.blockers.length, 0);
});

test('asAdmissionStage normalizes known values and rejects unknown values', () => {
    assert.equal(asAdmissionStage('ACTIVE'), ADMISSION_STAGES.ACTIVE);
    assert.equal(asAdmissionStage(LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW), ADMISSION_STAGES.AI_DECISION);
    assert.equal(asAdmissionStage('UNKNOWN_STAGE'), null);
});

test('missing identity precondition takes precedence over downstream status queues', () => {
    const result = deriveAdmissionStage({
        hasIdentity: false,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'EXCEPTION_REQUIRED',
            current_step: 'EXCEPTION_REVIEW',
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
        hasExceptionCase: true,
        hasAppealOpen: true,
        hasAuditReview: true,
    });

    assert.equal(result.stage, ADMISSION_STAGES.IDENTITY);
    assert.deepEqual(result.blockers, [STATUS_BLOCKER_CODES.IDENTITY_REQUIRED]);
});

test('documents branch emits stacked blockers when resubmit signals exist', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: false,
        hasSoulCredential: false,
        application: {
            status: 'IN_PROGRESS',
            current_step: 'DOCUMENTS',
            soul_issued_at: null,
        },
        hasResubmitRequest: true,
        hasRejectedDocument: true,
    });

    assert.equal(result.stage, ADMISSION_STAGES.RESUBMIT_REQUIRED);
    assert.deepEqual(result.blockers, [
        STATUS_BLOCKER_CODES.DOCUMENTS_REQUIRED,
        STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED,
    ]);
});

test('explicit rejected status takes precedence before document completeness checks', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: false,
        hasSoulCredential: false,
        application: {
            status: 'REJECTED',
            current_step: 'DOCUMENTS',
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.REJECTED);
    assert.deepEqual(result.blockers, [STATUS_BLOCKER_CODES.ADMISSION_REJECTED]);
});

test('legacy HUMAN_REVIEW current_step maps to EXCEPTION_REVIEW with blocker', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'IN_PROGRESS',
            current_step: LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW,
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.deepEqual(result.blockers, [STATUS_BLOCKER_CODES.LEGACY_REVIEW_STAGE]);
});

test('legacy AI_REVIEW current_step maps to AI_DECISION with pending blocker', () => {
    const result = deriveAdmissionStage({
        hasIdentity: true,
        hasLiveness: true,
        consentCompleted: true,
        documentsCompleted: true,
        hasSoulCredential: false,
        application: {
            status: 'IN_PROGRESS',
            current_step: LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW,
            soul_issued_at: null,
        },
        hasResubmitRequest: false,
        hasRejectedDocument: false,
    });

    assert.equal(result.stage, ADMISSION_STAGES.AI_DECISION);
    assert.deepEqual(result.blockers, [STATUS_BLOCKER_CODES.AI_DECISION_PENDING]);
});

test('active+credential fast-path stays highest precedence', () => {
    const result = deriveAdmissionStage({
        hasIdentity: false,
        hasLiveness: false,
        consentCompleted: false,
        documentsCompleted: false,
        hasSoulCredential: true,
        application: {
            status: 'ACTIVE',
            current_step: 'IDENTITY',
            soul_issued_at: '2026-03-06T00:00:00.000Z',
        },
        hasResubmitRequest: true,
        hasRejectedDocument: true,
    });

    assert.equal(result.stage, ADMISSION_STAGES.ACTIVE);
    assert.deepEqual(result.blockers, []);
});
