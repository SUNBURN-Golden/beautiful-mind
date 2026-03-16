import assert from 'node:assert/strict';
import test from 'node:test';

const { handleActiveReviewSubmit } = await import('../../lib/server/active-review-submit.ts');
const {
    ActiveReviewSubmitResponseSchema,
    TRUST_ATTESTATION_ACK_PHRASE,
} = await import('../../lib/contracts/active-review-contract.ts');
const { ActiveErrorSchema } = await import('../../lib/contracts/active-stage-contract.ts');

function makeRequest(body) {
    return new Request('http://localhost/api/active/review/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('active review submit route handler returns API envelope on success', async () => {
    let called = false;
    const response = await handleActiveReviewSubmit(
        makeRequest({
            selected_items: ['PERSON_MATCH', 'CONSENT_RESPECT'],
            escalation_requested: true,
            note: 'structured attestation note',
            ack_phrase: TRUST_ATTESTATION_ACK_PHRASE,
            match_id: null,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({ service: 'client' }),
            submitActiveTrustAttestation: async (_admin, userId, params) => {
                called = true;
                assert.equal(userId, 'user-1');
                assert.deepEqual(params.selected_items, ['PERSON_MATCH', 'CONSENT_RESPECT']);
                assert.equal(params.escalation_requested, true);
                return {
                    event_id: 'TA-ROUTE-1',
                    submitted_at: '2026-03-11T00:00:00.000Z',
                    selected_items: ['PERSON_MATCH', 'CONSENT_RESPECT'],
                    escalation_requested: true,
                };
            },
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(called, true);
    assert.equal(ActiveReviewSubmitResponseSchema.safeParse(payload).success, true);
    assert.equal(payload.source, 'API');
    assert.equal(payload.data.event_id, 'TA-ROUTE-1');
    assert.equal(payload.data.escalation_requested, true);
});

test('active review submit route handler rejects invalid payload with 400 and no write', async () => {
    let called = false;
    const response = await handleActiveReviewSubmit(
        makeRequest({
            selected_items: [],
            escalation_requested: false,
            note: '',
            ack_phrase: 'INVALID_PHRASE',
            match_id: null,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitActiveTrustAttestation: async () => {
                called = true;
                throw new Error('UNEXPECTED_CALL');
            },
        },
    );

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'BAD_REQUEST');
    assert.equal(called, false);
});

test('active review submit route handler fails closed on contract mismatch', async () => {
    const response = await handleActiveReviewSubmit(
        makeRequest({
            selected_items: ['PERSON_MATCH'],
            escalation_requested: false,
            note: '',
            ack_phrase: TRUST_ATTESTATION_ACK_PHRASE,
            match_id: null,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitActiveTrustAttestation: async () => ({
                submitted_at: '2026-03-11T00:00:00.000Z',
            }),
        },
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'ACTIVE_REVIEW_CONTRACT_MISMATCH');
});
