import assert from 'node:assert/strict';
import test from 'node:test';

const {
    completeIdentityVerificationSession,
    completeLivenessVerificationSession,
    fetchLivenessVerificationSessionResult,
    startAdmissionApplication,
    startIdentityVerificationSession,
    startLivenessVerificationSession,
    submitIdentityVerification,
    fetchAdmissionAppealStatus,
} = await import('../../lib/admission-client.ts');

const originalFetch = globalThis.fetch;

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

test('startAdmissionApplication enforces success contract shape', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        application_id: 'app-1',
        status: 'IN_PROGRESS',
        current_step: 'IDENTITY',
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await startAdmissionApplication();
    assert.equal(result.success, true);
    assert.equal(result.application_id, 'app-1');
    assert.equal(result.current_step, 'IDENTITY');
});

test('submitIdentityVerification extracts nested backend error payloads', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        error: {
            code: 'NAME_MISMATCH',
            message: 'Input name does not match verified identity.',
        },
    }, 400);
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    await assert.rejects(
        () => submitIdentityVerification({ identityVerificationId: 'mock_123', name: 'Other' }),
        /Input name does not match verified identity\./,
    );
});

test('startIdentityVerificationSession validates provider session contract', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        provider: 'PORTONE',
        session: {
            mode: 'PORTONE_SDK',
            identity_verification_id: 'idv_1',
            redirect_url: 'https://example.com/apply/identity/callback',
            store_id: 'store_1',
            channel_key: 'channel_1',
            expires_at: '2026-03-11T00:10:00.000Z',
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await startIdentityVerificationSession({
        name: '홍길동',
        phone: '01012345678',
    });
    assert.equal(result.provider, 'PORTONE');
    assert.equal(result.session.mode, 'PORTONE_SDK');
    assert.equal(result.session.identity_verification_id, 'idv_1');
});

test('completeIdentityVerificationSession maps identity callback completion contract', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        verified: true,
        receipt_id: 'receipt_1',
        next_step: 'LIVENESS',
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await completeIdentityVerificationSession({
        identityVerificationId: 'idv_1',
    });
    assert.equal(result.verified, true);
    assert.equal(result.next_step, 'LIVENESS');
});

test('startLivenessVerificationSession validates camera session contract', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        provider: 'LIVENESS',
        session: {
            mode: 'CAMERA_CAPTURE',
            session_id: 'lvs_1',
            callback_url: 'https://example.com/apply/liveness/callback?session_id=lvs_1',
            result_url: 'https://example.com/api/admission/liveness/session/result?session_id=lvs_1',
            expires_at: '2026-03-11T00:10:00.000Z',
            capture_timeout_ms: 90000,
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await startLivenessVerificationSession();
    assert.equal(result.provider, 'LIVENESS');
    assert.equal(result.session.mode, 'CAMERA_CAPTURE');
    assert.equal(result.session.session_id, 'lvs_1');
});

test('completeLivenessVerificationSession validates completion envelope', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        verification_state: 'VERIFIED',
        session_id: 'lvs_1',
        verified: true,
        next_step: 'CONSENTS',
        result_url: 'https://example.com/api/admission/liveness/session/result?session_id=lvs_1',
        retryable: false,
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await completeLivenessVerificationSession({
        session_id: 'lvs_1',
        capture_hash: 'a'.repeat(64),
        immediate_purge_confirmed: true,
    });
    assert.equal(result.verification_state, 'VERIFIED');
    assert.equal(result.verified, true);
    assert.equal(result.next_step, 'CONSENTS');
});

test('fetchLivenessVerificationSessionResult validates polling result envelope', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        session_id: 'lvs_1',
        status: 'VERIFIED',
        verified: true,
        next_step: 'CONSENTS',
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await fetchLivenessVerificationSessionResult({ session_id: 'lvs_1' });
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.verified, true);
    assert.equal(result.next_step, 'CONSENTS');
});

test('fetchAdmissionAppealStatus validates response envelope from backend', async (t) => {
    globalThis.fetch = async () => jsonResponse({
        success: true,
        has_appeal: true,
        data: {
            appeal: {
                id: 'appeal-1',
                status: 'OPEN',
                created_at: '2026-03-11T00:00:00.000Z',
                resolved_at: null,
                resolution_type: null,
            },
        },
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const result = await fetchAdmissionAppealStatus();
    assert.equal(result.has_appeal, true);
    assert.equal(result.data?.appeal?.id, 'appeal-1');
});
