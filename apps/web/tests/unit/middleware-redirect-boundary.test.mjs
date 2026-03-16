import assert from 'node:assert/strict';
import test from 'node:test';

const { resolveMiddlewareRedirect } = await import('../../lib/server/middleware-access.ts');
const { ADMISSION_STAGES } = await import('../../lib/contracts/status-stages.ts');
const { STAGE_ROUTES } = await import('../../lib/stageRoutes.ts');

function evaluate(input) {
    const decision = resolveMiddlewareRedirect(input);
    if (!decision) return null;
    return {
        pathname: decision.pathname,
        searchParams: decision.searchParams || {},
    };
}

test('unauthenticated users are redirected on protected routes and allowed on public routes', () => {
    assert.deepEqual(
        evaluate({
            pathname: STAGE_ROUTES.DOCUMENTS,
            hasPublicEnv: true,
            hasUser: false,
        }),
        { pathname: '/login', searchParams: {} },
    );

    assert.equal(
        evaluate({
            pathname: '/manual',
            hasPublicEnv: true,
            hasUser: false,
        }),
        null,
    );
});

test('authenticated non-active users are routed to admission recovery paths', () => {
    const nonActive = {
        hasPublicEnv: true,
        hasUser: true,
        isActive: false,
    };

    assert.deepEqual(
        evaluate({ ...nonActive, pathname: '/dashboard' }),
        { pathname: '/apply/status', searchParams: {} },
    );
    assert.deepEqual(
        evaluate({ ...nonActive, pathname: '/login' }),
        { pathname: '/apply/status', searchParams: {} },
    );
    assert.equal(
        evaluate({ ...nonActive, pathname: '/apply/liveness' }),
        null,
    );
    assert.deepEqual(
        evaluate({ ...nonActive, pathname: '/onboarding/verify' }),
        { pathname: '/apply/status', searchParams: {} },
    );
});

test('identity/liveness pending, resubmit, and exception-review (all non-active) stay blocked from ACTIVE routes', () => {
    const nonActiveVariants = [
        { label: 'IDENTITY_OR_LIVENESS_PENDING', pathname: '/match' },
        { label: ADMISSION_STAGES.RESUBMIT_REQUIRED, pathname: '/report' },
        { label: ADMISSION_STAGES.EXCEPTION_REVIEW, pathname: '/review' },
    ];

    for (const variant of nonActiveVariants) {
        const decision = evaluate({
            pathname: variant.pathname,
            hasPublicEnv: true,
            hasUser: true,
            isActive: false,
        });
        assert.deepEqual(decision, { pathname: '/apply/status', searchParams: {} }, variant.label);
    }

    assert.equal(
        evaluate({
            pathname: '/apply/status',
            hasPublicEnv: true,
            hasUser: true,
            isActive: false,
        }),
        null,
    );
});

test('representative non-active state cases still redirect away from ACTIVE-only routes at middleware boundary', () => {
    const representativeStates = [
        { label: ADMISSION_STAGES.REJECTED, pathname: '/dashboard' },
        { label: ADMISSION_STAGES.RESUBMIT_REQUIRED, pathname: '/match' },
        { label: ADMISSION_STAGES.APPEAL_PENDING, pathname: '/chat' },
        { label: 'UNDER_REVIEW', pathname: '/report' },
        { label: 'MANUAL_REVIEW', pathname: '/review' },
    ];

    for (const stateCase of representativeStates) {
        assert.deepEqual(
            evaluate({
                pathname: stateCase.pathname,
                hasPublicEnv: true,
                hasUser: true,
                isActive: false,
            }),
            { pathname: '/apply/status', searchParams: {} },
            stateCase.label,
        );
    }
});

test('ACTIVE users bypass admission pages and legacy routes to dashboard', () => {
    const active = {
        hasPublicEnv: true,
        hasUser: true,
        isActive: true,
    };

    assert.equal(
        evaluate({ ...active, pathname: STAGE_ROUTES.ACTIVE }),
        null,
    );
    assert.deepEqual(
        evaluate({ ...active, pathname: '/apply/status' }),
        { pathname: '/dashboard', searchParams: {} },
    );
    assert.deepEqual(
        evaluate({ ...active, pathname: '/onboarding/qualification' }),
        { pathname: '/dashboard', searchParams: {} },
    );
});

test('banned/frozen/admin boundary rules are enforced at middleware level', () => {
    assert.deepEqual(
        evaluate({
            pathname: '/apply/status',
            hasPublicEnv: true,
            hasUser: true,
            isBanned: true,
        }),
        { pathname: '/login', searchParams: { error: 'ACCOUNT_BANNED' } },
    );

    assert.deepEqual(
        evaluate({
            pathname: '/apply/status',
            hasPublicEnv: true,
            hasUser: true,
            isFrozen: true,
            isActive: false,
        }),
        { pathname: '/banned', searchParams: {} },
    );

    assert.deepEqual(
        evaluate({
            pathname: '/banned',
            hasPublicEnv: true,
            hasUser: true,
            isFrozen: false,
            isActive: false,
        }),
        { pathname: '/apply/status', searchParams: {} },
    );

    assert.deepEqual(
        evaluate({
            pathname: '/banned',
            hasPublicEnv: true,
            hasUser: true,
            isFrozen: false,
            isActive: true,
        }),
        { pathname: '/dashboard', searchParams: {} },
    );

    assert.deepEqual(
        evaluate({
            pathname: '/admin/admissions',
            hasPublicEnv: true,
            hasUser: true,
            isAdmin: false,
            isActive: false,
        }),
        { pathname: '/', searchParams: {} },
    );

    assert.equal(
        evaluate({
            pathname: '/admin/admissions',
            hasPublicEnv: true,
            hasUser: true,
            isAdmin: true,
            isActive: true,
        }),
        null,
    );
});

test('server misconfiguration redirects only protected/admin paths', () => {
    assert.deepEqual(
        evaluate({
            pathname: '/apply',
            hasPublicEnv: false,
            hasUser: false,
        }),
        { pathname: '/login', searchParams: { error: 'SERVER_MISCONFIG' } },
    );

    assert.equal(
        evaluate({
            pathname: '/manual',
            hasPublicEnv: false,
            hasUser: false,
        }),
        null,
    );
});
