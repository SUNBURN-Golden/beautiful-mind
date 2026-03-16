import test from 'node:test';
import assert from 'node:assert/strict';

const { ADMISSION_STAGES, LEGACY_ADMISSION_STAGE_CODES } = await import('../../lib/contracts/status-stages.ts');
const {
    STAGE_ROUTES,
    getExpectedRoute,
    normalizeStage,
    resolveStatusStage,
    resolveGuardRedirect,
} = await import('../../lib/stageRoutes.ts');

test('admission stage routes map ACTIVE to dashboard', () => {
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.ACTIVE], '/dashboard');
    assert.equal(getExpectedRoute(ADMISSION_STAGES.ACTIVE), '/dashboard');
});

test('admission stage routes map DOCUMENTS and RESUBMIT_REQUIRED to apply/documents', () => {
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.DOCUMENTS], '/apply/documents');
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.RESUBMIT_REQUIRED], '/apply/documents');
    assert.equal(getExpectedRoute(ADMISSION_STAGES.RESUBMIT_REQUIRED), '/apply/documents');
});

test('admission stage routes map AI_DECISION to apply/review', () => {
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.AI_DECISION], '/apply/review');
    assert.equal(getExpectedRoute(ADMISSION_STAGES.AI_DECISION), '/apply/review');
});

test('cold path stages map to apply/status', () => {
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.EXCEPTION_REVIEW], '/apply/status');
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.APPEAL_PENDING], '/apply/status');
    assert.equal(STAGE_ROUTES[ADMISSION_STAGES.AUDIT_REVIEW], '/apply/status');
});

test('legacy stage aliases normalize into active client stage vocabulary', () => {
    assert.equal(normalizeStage(LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW), ADMISSION_STAGES.AI_DECISION);
    assert.equal(normalizeStage(LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW), ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.equal(normalizeStage(ADMISSION_STAGES.ACTIVE), ADMISSION_STAGES.ACTIVE);
    assert.equal(normalizeStage('UNKNOWN_STAGE'), null);
});

test('resolveStatusStage uses stage first then step compatibility fallback', () => {
    assert.equal(
        resolveStatusStage({ stage: LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW, step: ADMISSION_STAGES.DOCUMENTS }),
        ADMISSION_STAGES.AI_DECISION,
    );
    assert.equal(
        resolveStatusStage({ stage: 'UNKNOWN_STAGE', step: LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW }),
        ADMISSION_STAGES.EXCEPTION_REVIEW,
    );
    assert.equal(resolveStatusStage({ step: ADMISSION_STAGES.ACTIVE }), ADMISSION_STAGES.ACTIVE);
    assert.equal(resolveStatusStage({}), null);
});

test('resolveGuardRedirect preserves representative route-guard behavior', () => {
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/documents', stage: ADMISSION_STAGES.DOCUMENTS, isFrozen: true }),
        '/banned',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/banned', stage: ADMISSION_STAGES.ACTIVE, isFrozen: false }),
        '/dashboard',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/banned', stage: null, isFrozen: false }),
        '/apply',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply', stage: ADMISSION_STAGES.ACTIVE, isFrozen: false }),
        '/dashboard',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/appeal', stage: ADMISSION_STAGES.REJECTED, isFrozen: false }),
        null,
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/identity/callback', stage: ADMISSION_STAGES.IDENTITY, isFrozen: false }),
        null,
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/liveness/callback', stage: ADMISSION_STAGES.LIVENESS, isFrozen: false }),
        null,
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/documents', stage: ADMISSION_STAGES.REJECTED, isFrozen: false }),
        '/apply/status',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/dashboard', stage: ADMISSION_STAGES.DOCUMENTS, isFrozen: false }),
        '/apply/documents',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/consents', stage: ADMISSION_STAGES.LIVENESS, isFrozen: false }),
        '/apply/liveness',
    );
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/status', stage: ADMISSION_STAGES.RESUBMIT_REQUIRED, isFrozen: false }),
        null,
    );
});

test('state matrix keeps route access aligned for ACTIVE, rejected, resubmit, appeal, and manual-review paths', () => {
    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/status', stage: ADMISSION_STAGES.ACTIVE, isFrozen: false }),
        '/dashboard',
    );

    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/appeal', stage: ADMISSION_STAGES.REJECTED, isFrozen: false }),
        null,
    );

    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/documents', stage: ADMISSION_STAGES.RESUBMIT_REQUIRED, isFrozen: false }),
        null,
    );

    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/appeal', stage: ADMISSION_STAGES.APPEAL_PENDING, isFrozen: false }),
        null,
    );

    assert.equal(
        resolveGuardRedirect({ pathname: '/apply/appeal', stage: ADMISSION_STAGES.EXCEPTION_REVIEW, isFrozen: false }),
        null,
    );
});
