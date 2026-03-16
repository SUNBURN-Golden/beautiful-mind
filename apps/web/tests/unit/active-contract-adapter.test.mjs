import assert from 'node:assert/strict';
import test from 'node:test';

const {
    completeMeetingSession,
    fetchConversationSeed,
    fetchMatchCandidates,
    sendConversationMessage,
    submitIncidentReport,
    submitParticipationRevoke,
    submitTrustAttestation,
} = await import('../../lib/active-contract.ts');
const { TRUST_ATTESTATION_ACK_PHRASE } = await import('../../lib/contracts/active-review-contract.ts');

const originalFetch = globalThis.fetch;

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

test('fetchMatchCandidates parses API envelope with stable adapter mapping', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: [
            {
                id: 'match-1',
                partner_id: 'user-2',
                partner_name: 'Partner',
                trust_signal: 120,
                status: 'ACTIVE',
                tags: ['우선 연결'],
                updated_at: '2026-03-11T00:00:00.000Z',
            },
        ],
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await fetchMatchCandidates();
    assert.equal(result.source, 'API');
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].partnerId, 'user-2');
    assert.equal(result.data[0].statusLabel, 'Connection ready');
});

test('fetchMatchCandidates keeps empty-state contract when backend returns empty list', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: [],
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await fetchMatchCandidates();
    assert.equal(result.source, 'API');
    assert.deepEqual(result.data, []);
});

test('active contract throws explicit mismatch error on malformed payload', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: [
            {
                // id missing on purpose -> contract mismatch
                partner_id: 'user-2',
                partner_name: 'Partner',
                trust_signal: 120,
                status: 'ACTIVE',
            },
        ],
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    await assert.rejects(
        () => fetchMatchCandidates(),
        /ACTIVE_MATCHES_LOAD_FAILED_CONTRACT_MISMATCH/,
    );
});

test('submitParticipationRevoke maps stable response shape for UI state', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            request_id: 'req-1',
            submitted_at: '2026-03-11T00:00:00.000Z',
            status: 'RECEIVED',
            hidden_matches: 2,
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await submitParticipationRevoke({
        pauseParticipation: true,
        withdrawDataProcessing: false,
    });

    assert.equal(result.source, 'API');
    assert.equal(result.data.requestId, 'req-1');
    assert.equal(result.data.hiddenMatches, 2);
    assert.equal(result.data.status, 'RECEIVED');
});

test('fetchConversationSeed maps stable chat thread shape including empty messages', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            match_id: 'm-1',
            partner_id: 'u-2',
            partner_name: 'Partner',
            messages: [],
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await fetchConversationSeed('m-1');
    assert.equal(result.source, 'API');
    assert.equal(result.data.matchId, 'm-1');
    assert.equal(result.data.partnerName, 'Partner');
    assert.deepEqual(result.data.messages, []);
});

test('sendConversationMessage maps stable response shape for UI append', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            id: 'msg-1',
            sender: '나',
            mine: true,
            text: 'hello',
            sent_at: '2026-03-11T00:00:00.000Z',
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await sendConversationMessage({
        matchId: '11111111-1111-1111-1111-111111111111',
        content: 'hello',
    });

    assert.equal(result.source, 'API');
    assert.equal(result.data.id, 'msg-1');
    assert.equal(result.data.mine, true);
    assert.equal(result.data.text, 'hello');
});

test('completeMeetingSession maps transition payload for review handoff', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            review_session_id: 'rs-1',
            transition_messages: [
                { sender: 'System', text: '[시스템] 이동' },
            ],
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await completeMeetingSession('11111111-1111-1111-1111-111111111111');
    assert.equal(result.source, 'API');
    assert.equal(result.data.reviewSessionId, 'rs-1');
    assert.equal(result.data.transitionMessages.length, 1);
});

test('submitIncidentReport maps stable response shape and keeps queue semantics', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            report_id: 'rep-1',
            submitted_at: '2026-03-11T00:00:00.000Z',
            escalation_queued: true,
            linked_match_id: null,
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await submitIncidentReport({
        summary: '신고 사유를 충분히 구체적으로 작성했습니다.',
        targetLabel: 'target',
        matchId: null,
    });
    assert.equal(result.source, 'API');
    assert.equal(result.data.reportId, 'rep-1');
    assert.equal(result.data.escalationQueued, true);
    assert.equal(result.data.linkedMatchId, null);
});

test('adapter error parser prefers backend message over fallback code', async (t) => {
    globalThis.fetch = async () => jsonResponse(
        {
            error: 'ACTIVE_REPORT_SUBMIT_FAILED',
            message: 'MATCH_NOT_FOUND',
        },
        404,
    );
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    await assert.rejects(
        () => submitIncidentReport({
            summary: '신고 사유를 충분히 구체적으로 작성했습니다.',
            targetLabel: 'target',
            matchId: '11111111-1111-1111-1111-111111111111',
        }),
        /MATCH_NOT_FOUND/,
    );
});

test('submitTrustAttestation maps API response into stable client-facing shape', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            event_id: 'TA-TEST-123',
            submitted_at: '2026-03-11T00:00:00.000Z',
            selected_items: ['PERSON_MATCH', 'CONSENT_RESPECT'],
            escalation_requested: true,
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await submitTrustAttestation({
        selectedItems: ['PERSON_MATCH', 'CONSENT_RESPECT'],
        escalationRequested: true,
        note: 'Structured event note',
        ackPhrase: TRUST_ATTESTATION_ACK_PHRASE,
    });

    assert.equal(result.source, 'API');
    assert.equal(result.data.eventId, 'TA-TEST-123');
    assert.equal(result.data.submittedAt, '2026-03-11T00:00:00.000Z');
    assert.deepEqual(result.data.selectedItems, ['PERSON_MATCH', 'CONSENT_RESPECT']);
    assert.equal(result.data.escalationRequested, true);
});

test('submitTrustAttestation throws contract mismatch on malformed API payload', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        source: 'API',
        data: {
            submitted_at: '2026-03-11T00:00:00.000Z',
            selected_items: ['PERSON_MATCH'],
            escalation_requested: false,
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    await assert.rejects(
        () => submitTrustAttestation({
            selectedItems: ['PERSON_MATCH'],
            escalationRequested: false,
            note: '',
            ackPhrase: TRUST_ATTESTATION_ACK_PHRASE,
        }),
        /ACTIVE_REVIEW_SUBMIT_FAILED_CONTRACT_MISMATCH/,
    );
});
