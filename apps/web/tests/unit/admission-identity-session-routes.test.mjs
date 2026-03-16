import assert from 'node:assert/strict';
import test from 'node:test';

const { handleIdentitySessionStart } = await import('../../lib/server/admission-identity-session-start.ts');
const { handleIdentitySessionComplete } = await import('../../lib/server/admission-identity-session-complete.ts');
const {
    IdentitySessionStartResponseSchema,
    IdentitySessionCompleteResponseSchema,
} = await import('../../lib/contracts/admission-identity-contract.ts');
const { ActiveErrorSchema } = await import('../../lib/contracts/active-stage-contract.ts');

function postRequest(url, body) {
    return new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('identity session start returns contract-stable payload in provider mode', async () => {
    const response = await handleIdentitySessionStart(
        postRequest('http://localhost/api/admission/identity/session/start', {
            name: '홍길동',
            phone: '01012345678',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            ensureIdentityApplication: async () => {},
            isTestRouteEnabled: () => false,
            getPortOneConfig: () => ({ storeId: 'store-1', channelKey: 'channel-1' }),
            buildIdentityVerificationId: () => 'idv_test_1',
            buildCallbackUrl: () => 'http://localhost/apply/identity/callback',
            now: () => new Date('2026-03-11T00:00:00.000Z'),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(IdentitySessionStartResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.session.mode, 'PORTONE_SDK');
    assert.equal(payload.session.identity_verification_id, 'idv_test_1');
});

test('identity session start falls back to explicit test redirect contract', async () => {
    const response = await handleIdentitySessionStart(
        postRequest('http://localhost/api/admission/identity/session/start', {}),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            ensureIdentityApplication: async () => {},
            isTestRouteEnabled: () => true,
            getPortOneConfig: () => ({ storeId: null, channelKey: null }),
            buildIdentityVerificationId: () => 'idv_test_2',
            buildCallbackUrl: () => 'http://localhost/apply/identity/callback',
            now: () => new Date('2026-03-11T00:00:00.000Z'),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.session.mode, 'TEST_REDIRECT');
    assert.match(payload.session.handoff_url, /identityVerificationId=mock_success/);
});

test('identity session complete forwards upstream success and adds next_step', async () => {
    const response = await handleIdentitySessionComplete(
        postRequest('http://localhost/api/admission/identity/session/complete', {
            identityVerificationId: 'idv_1',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            forwardVerifyComplete: async () => ({
                status: 200,
                payload: {
                    success: true,
                    verified: true,
                    receipt_id: 'receipt-1',
                },
            }),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(IdentitySessionCompleteResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.next_step, 'LIVENESS');
});

test('identity session complete forwards authenticated user id and parsed payload to verifier dependency', async () => {
    let seenUserId = null;
    let seenPayload = null;
    const response = await handleIdentitySessionComplete(
        postRequest('http://localhost/api/admission/identity/session/complete', {
            identityVerificationId: 'idv_1',
            name: '홍길동',
            phone: '01012345678',
        }),
        {
            getSessionUser: async () => ({ id: 'user-42' }),
            forwardVerifyComplete: async (userId, payload) => {
                seenUserId = userId;
                seenPayload = payload;
                return {
                    status: 200,
                    payload: {
                        success: true,
                        verified: true,
                        receipt_id: 'receipt-1',
                    },
                };
            },
        },
    );

    assert.equal(response.status, 200);
    assert.equal(seenUserId, 'user-42');
    assert.equal(seenPayload.identityVerificationId, 'idv_1');
    assert.equal(seenPayload.name, '홍길동');
    assert.equal(seenPayload.phone, '01012345678');
});

test('identity session complete fails closed on success-payload contract mismatch', async () => {
    const response = await handleIdentitySessionComplete(
        postRequest('http://localhost/api/admission/identity/session/complete', {
            identityVerificationId: 'idv_1',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            forwardVerifyComplete: async () => ({
                status: 200,
                payload: {
                    success: true,
                    receipt_id: 'receipt-1',
                },
            }),
        },
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'IDENTITY_COMPLETE_CONTRACT_MISMATCH');
});
