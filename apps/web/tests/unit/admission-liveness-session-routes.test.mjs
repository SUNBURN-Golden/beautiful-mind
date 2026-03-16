import assert from 'node:assert/strict';
import test from 'node:test';

const { handleLivenessSessionStart } = await import('../../lib/server/admission-liveness-session-start.ts');
const { handleLivenessSessionComplete } = await import('../../lib/server/admission-liveness-session-complete.ts');
const { handleLivenessSessionResult } = await import('../../lib/server/admission-liveness-session-result.ts');
const {
    LivenessSessionStartResponseSchema,
    LivenessSessionCompleteResponseSchema,
    LivenessSessionResultResponseSchema,
} = await import('../../lib/contracts/admission-liveness-contract.ts');
const { ActiveErrorSchema } = await import('../../lib/contracts/active-stage-contract.ts');

function postRequest(url, body) {
    return new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('liveness session start returns contract-stable payload', async () => {
    const response = await handleLivenessSessionStart(
        postRequest('http://localhost/api/admission/liveness/session/start', {
            capture_mode: 'CAMERA',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            hasIdentityClaim: async () => true,
            ensureLivenessApplication: async () => {},
            isTestRouteEnabled: () => false,
            buildSessionId: () => 'lvs_test_1',
            buildCallbackUrl: () => 'http://localhost/apply/liveness/callback?session_id=lvs_test_1',
            buildResultUrl: () => 'http://localhost/api/admission/liveness/session/result?session_id=lvs_test_1',
            now: () => new Date('2026-03-11T00:00:00.000Z'),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(LivenessSessionStartResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.session.mode, 'CAMERA_CAPTURE');
    assert.equal(payload.session.session_id, 'lvs_test_1');
});

test('liveness session start blocks when identity is missing', async () => {
    const response = await handleLivenessSessionStart(
        postRequest('http://localhost/api/admission/liveness/session/start', {}),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            hasIdentityClaim: async () => false,
            ensureLivenessApplication: async () => {},
            isTestRouteEnabled: () => false,
            buildSessionId: () => 'lvs_test_2',
            buildCallbackUrl: () => 'http://localhost/apply/liveness/callback?session_id=lvs_test_2',
            buildResultUrl: () => 'http://localhost/api/admission/liveness/session/result?session_id=lvs_test_2',
            now: () => new Date(),
        },
    );

    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'IDENTITY_REQUIRED');
});

test('liveness session complete returns verified contract payload', async () => {
    const response = await handleLivenessSessionComplete(
        postRequest('http://localhost/api/admission/liveness/session/complete', {
            session_id: 'lvs_test_1',
            capture_hash: 'a'.repeat(64),
            immediate_purge_confirmed: true,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            completeVerification: async () => ({
                verified: true,
                next_step: 'CONSENTS',
            }),
            buildResultUrl: () => 'http://localhost/api/admission/liveness/session/result?session_id=lvs_test_1',
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(LivenessSessionCompleteResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.verification_state, 'VERIFIED');
    assert.equal(payload.verified, true);
});

test('liveness session complete forwards authenticated user id and parsed payload to verifier dependency', async () => {
    let seenUserId = null;
    let seenPayload = null;
    const response = await handleLivenessSessionComplete(
        postRequest('http://localhost/api/admission/liveness/session/complete', {
            session_id: 'lvs_test_2',
            capture_hash: 'b'.repeat(64),
            immediate_purge_confirmed: true,
        }),
        {
            getSessionUser: async () => ({ id: 'user-99' }),
            completeVerification: async (userId, payload) => {
                seenUserId = userId;
                seenPayload = payload;
                return {
                    verified: true,
                    next_step: 'CONSENTS',
                };
            },
            buildResultUrl: () => 'http://localhost/api/admission/liveness/session/result?session_id=lvs_test_2',
        },
    );

    assert.equal(response.status, 200);
    assert.equal(seenUserId, 'user-99');
    assert.equal(seenPayload.session_id, 'lvs_test_2');
    assert.equal(seenPayload.capture_hash, 'b'.repeat(64));
    assert.equal(seenPayload.immediate_purge_confirmed, true);
});

test('liveness session result returns polling payload', async () => {
    const response = await handleLivenessSessionResult(
        new Request('http://localhost/api/admission/liveness/session/result?session_id=lvs_test_1'),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            readSessionResult: async () => ({
                status: 'PENDING',
                verified: false,
                message: 'Waiting for liveness verification result.',
            }),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(LivenessSessionResultResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.status, 'PENDING');
    assert.equal(payload.verified, false);
});
