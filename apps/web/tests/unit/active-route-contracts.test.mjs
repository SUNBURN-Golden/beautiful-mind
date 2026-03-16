import assert from 'node:assert/strict';
import test from 'node:test';

const { handleActiveMatchesGet } = await import('../../lib/server/active-matches-handler.ts');
const { handleActiveChatGet, handleActiveChatPost } = await import('../../lib/server/active-chat-handler.ts');
const { handleActiveReportSubmit } = await import('../../lib/server/active-report-handler.ts');
const { handleActiveRevokeSubmit } = await import('../../lib/server/active-revoke-handler.ts');
const {
    ActiveErrorSchema,
    ChatThreadEnvelopeSchema,
    IncidentEnvelopeSchema,
    MatchesEnvelopeSchema,
    MessageEnvelopeSchema,
    RevokeEnvelopeSchema,
} = await import('../../lib/contracts/active-stage-contract.ts');

function request(url, body) {
    return new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('active matches route handler returns contract-stable API envelope', async () => {
    const response = await handleActiveMatchesGet(
        new Request('http://localhost/api/active/matches'),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            listActiveMatches: async () => ([
                {
                    id: 'm-1',
                    partner_id: 'u-2',
                    partner_name: 'Partner',
                    trust_signal: 101,
                    status: 'ACTIVE',
                    tags: ['우선 연결'],
                    updated_at: '2026-03-11T00:00:00.000Z',
                },
            ]),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.source, 'API');
    assert.equal(MatchesEnvelopeSchema.safeParse(payload).success, true);
});

test('active matches route handler fails closed on contract mismatch', async () => {
    const response = await handleActiveMatchesGet(
        new Request('http://localhost/api/active/matches'),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            listActiveMatches: async () => ([
                {
                    partner_id: 'u-2',
                },
            ]),
        },
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'ACTIVE_MATCHES_CONTRACT_MISMATCH');
});

test('active chat GET route handler keeps empty-thread contract stable', async () => {
    const matchId = '11111111-1111-4111-8111-111111111111';
    const response = await handleActiveChatGet(
        new Request(`http://localhost/api/active/chat/messages?match_id=${matchId}`),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            listChatMessages: async () => ({
                match_id: matchId,
                partner_id: '22222222-2222-4222-8222-222222222222',
                partner_name: 'Partner',
                messages: [],
            }),
            sendChatMessage: async () => {
                throw new Error('UNEXPECTED');
            },
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(ChatThreadEnvelopeSchema.safeParse(payload).success, true);
    assert.deepEqual(payload.data.messages, []);
});

test('active chat POST route handler maps domain conflict to stable error shape', async () => {
    const matchId = '11111111-1111-4111-8111-111111111111';
    const response = await handleActiveChatPost(
        request('http://localhost/api/active/chat/messages', {
            match_id: matchId,
            content: 'hello',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            listChatMessages: async () => ({}),
            sendChatMessage: async () => {
                throw new Error('MATCH_INACTIVE');
            },
        },
    );

    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'MATCH_INACTIVE');
});

test('active chat POST route handler returns message envelope on success', async () => {
    const matchId = '11111111-1111-4111-8111-111111111111';
    const response = await handleActiveChatPost(
        request('http://localhost/api/active/chat/messages', {
            match_id: matchId,
            content: 'hello',
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            listChatMessages: async () => ({}),
            sendChatMessage: async () => ({
                id: 'msg-1',
                sender: '나',
                mine: true,
                text: 'hello',
                sent_at: '2026-03-11T00:00:00.000Z',
            }),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(MessageEnvelopeSchema.safeParse(payload).success, true);
});

test('active report route handler returns incident envelope on success', async () => {
    const response = await handleActiveReportSubmit(
        request('http://localhost/api/active/report/submit', {
            summary: '신고 사유를 충분히 구체적으로 작성했습니다.',
            target_label: 'target-user',
            match_id: null,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitActiveIncidentReport: async () => ({
                report_id: 'rep-1',
                submitted_at: '2026-03-11T00:00:00.000Z',
                escalation_queued: true,
                linked_match_id: null,
            }),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(IncidentEnvelopeSchema.safeParse(payload).success, true);
});

test('active report route handler fails closed on contract mismatch', async () => {
    const response = await handleActiveReportSubmit(
        request('http://localhost/api/active/report/submit', {
            summary: '신고 사유를 충분히 구체적으로 작성했습니다.',
            target_label: 'target-user',
            match_id: null,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitActiveIncidentReport: async () => ({
                report_id: null,
            }),
        },
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'ACTIVE_REPORT_CONTRACT_MISMATCH');
});

test('active revoke route handler returns BAD_REQUEST when no option selected', async () => {
    const response = await handleActiveRevokeSubmit(
        request('http://localhost/api/active/revoke/submit', {
            pause_participation: false,
            withdraw_data_processing: false,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitParticipationRevokeRequest: async () => {
                throw new Error('UNEXPECTED');
            },
        },
    );

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'BAD_REQUEST');
});

test('active revoke route handler returns revoke envelope on success', async () => {
    const response = await handleActiveRevokeSubmit(
        request('http://localhost/api/active/revoke/submit', {
            pause_participation: true,
            withdraw_data_processing: false,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitParticipationRevokeRequest: async () => ({
                request_id: 'req-1',
                submitted_at: '2026-03-11T00:00:00.000Z',
                status: 'RECEIVED',
                hidden_matches: 3,
            }),
        },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(RevokeEnvelopeSchema.safeParse(payload).success, true);
});

test('active revoke route handler fails closed on contract mismatch', async () => {
    const response = await handleActiveRevokeSubmit(
        request('http://localhost/api/active/revoke/submit', {
            pause_participation: true,
            withdraw_data_processing: false,
        }),
        {
            getSessionUser: async () => ({ id: 'user-1' }),
            getServiceRoleClient: () => ({}),
            submitParticipationRevokeRequest: async () => ({
                request_id: 'req-1',
                status: 'UNKNOWN',
            }),
        },
    );

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(ActiveErrorSchema.safeParse(payload).success, true);
    assert.equal(payload.error, 'ACTIVE_REVOKE_CONTRACT_MISMATCH');
});
