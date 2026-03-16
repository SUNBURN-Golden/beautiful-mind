import assert from 'node:assert/strict';
import test from 'node:test';

const { ADMISSION_POLICY_VERSION, REQUIRED_CONSENT_TYPES } = await import('../../lib/server/admission.ts');
const { ADMISSION_STAGES } = await import('../../lib/contracts/status-stages.ts');
const { STATUS_BLOCKER_CODES } = await import('../../lib/contracts/status-codes.ts');
const { getKnownStatusBlockerCodes } = await import('../../lib/contracts/status-copy.ts');
const { buildConsentProgress, requiredDocumentProgress } = await import('../../lib/server/status-ssot/progress.ts');
const { buildStatusResponse } = await import('../../lib/server/status-ssot/response.ts');

function buildGrantedConsents() {
    return REQUIRED_CONSENT_TYPES.map((consent) => ({
        consent_type: consent,
        granted_at: '2026-03-10T00:00:00.000Z',
        policy_version: ADMISSION_POLICY_VERSION,
    }));
}

function buildVerifiedRequiredDocuments() {
    return [
        'GRADUATION_CERTIFICATE',
        'INCOME_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'FAMILY_RELATION_CERTIFICATE',
    ].map((document_type) => ({
        document_type,
        upload_status: 'UPLOADED',
        processing_status: 'DONE',
        final_result: 'VERIFIED',
        ai_confidence: 0.91,
        uploaded_at: null,
        processed_at: null,
        purged_at: null,
    }));
}

function makeStatusInputs(overrides = {}) {
    return {
        truth: {
            profile: null,
            identity: null,
            application: null,
            documents: [],
            consentEvents: [],
            soulCredential: null,
            verifiedClaims: [],
            openAudits: [],
            latestAppeal: null,
            latestExceptionCase: null,
            latestAuditSample: null,
        },
        overlays: {
            reviewCase: null,
            latestSbtClaim: null,
            latestDecisionRun: null,
        },
        ...overrides,
    };
}

test('requiredDocumentProgress returns missing required documents only', () => {
    const progress = requiredDocumentProgress([
        {
            document_type: 'GRADUATION_CERTIFICATE',
            upload_status: 'UPLOADED',
            processing_status: 'DONE',
            final_result: 'VERIFIED',
            ai_confidence: 0.91,
            uploaded_at: null,
            processed_at: null,
            purged_at: null,
        },
        {
            document_type: 'UNKNOWN_TYPE',
            upload_status: 'UPLOADED',
            processing_status: 'DONE',
            final_result: 'VERIFIED',
            ai_confidence: 0.7,
            uploaded_at: null,
            processed_at: null,
            purged_at: null,
        },
    ]);

    assert.equal(progress.verifiedCount, 1);
    assert.equal(progress.totalRequired, 4);
    assert.deepEqual(progress.missing, [
        'INCOME_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'FAMILY_RELATION_CERTIFICATE',
    ]);
});

test('buildConsentProgress filters by policy version', () => {
    const progress = buildConsentProgress([
        {
            consent_type: REQUIRED_CONSENT_TYPES[0],
            granted_at: '2026-03-10T00:00:00.000Z',
            policy_version: ADMISSION_POLICY_VERSION,
        },
        {
            consent_type: REQUIRED_CONSENT_TYPES[1],
            granted_at: '2026-03-10T00:00:00.000Z',
            policy_version: 'legacy-policy',
        },
    ]);

    assert.equal(progress.consentCompleted, false);
    assert.equal(progress.consentSet.has(REQUIRED_CONSENT_TYPES[0]), true);
    assert.equal(progress.consentSet.has(REQUIRED_CONSENT_TYPES[1]), false);
});

test('buildStatusResponse keeps SSOT response shape for APPLY_START', () => {
    const response = buildStatusResponse(makeStatusInputs(), {
        serverTime: '2026-03-10T00:00:00.000Z',
    });

    assert.equal(response.stage, ADMISSION_STAGES.APPLY_START);
    assert.equal(response.step, ADMISSION_STAGES.APPLY_START);
    assert.equal(response.completed, false);
    assert.equal(response.next, ADMISSION_STAGES.APPLY_START);
    assert.equal(response.blockers[0], STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED);
    assert.equal(getKnownStatusBlockerCodes().includes(response.blockers[0]), true);
    assert.deepEqual(response.details?.missing_document_types, [
        'GRADUATION_CERTIFICATE',
        'INCOME_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'FAMILY_RELATION_CERTIFICATE',
    ]);
    assert.equal(response.meta.schema_version, 2);
    assert.equal(response.meta.policy_version, ADMISSION_POLICY_VERSION);
    assert.equal(response.meta.server_time, '2026-03-10T00:00:00.000Z');
    assert.equal(Array.isArray(response.meta.required_documents), true);
    assert.equal(Array.isArray(response.meta.required_consents), true);
});

test('buildStatusResponse maps RESUBMIT_REQUIRED application state to resubmit stage', () => {
    const consentEvents = buildGrantedConsents();
    const response = buildStatusResponse(makeStatusInputs({
        truth: {
            ...makeStatusInputs().truth,
            identity: { verified_at: '2026-03-10T00:00:00.000Z' },
            application: {
                id: 'app-1',
                status: 'RESUBMIT_REQUIRED',
                current_step: 'DOCUMENTS',
                policy_version: ADMISSION_POLICY_VERSION,
                submitted_at: null,
                ai_review_started_at: null,
                ai_review_completed_at: null,
                human_review_started_at: null,
                human_review_completed_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_reason_code: null,
                liveness_verified_at: '2026-03-10T00:00:00.000Z',
                soul_issued_at: null,
                activated_at: null,
            },
            documents: [{
                document_type: 'INCOME_CERTIFICATE',
                upload_status: 'UPLOADED',
                processing_status: 'RESUBMIT_REQUIRED',
                final_result: 'RESUBMIT_REQUIRED',
                ai_confidence: 0.22,
                uploaded_at: null,
                processed_at: null,
                purged_at: null,
            }],
            consentEvents,
        },
    }));

    assert.equal(response.stage, ADMISSION_STAGES.RESUBMIT_REQUIRED);
    assert.equal(response.blockers.includes(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED), true);
    assert.equal(response.meta.admission_status, 'RESUBMIT_REQUIRED');
});

test('buildStatusResponse maps ACTIVE inputs to ACTIVE stage with no blockers', () => {
    const response = buildStatusResponse(makeStatusInputs({
        truth: {
            ...makeStatusInputs().truth,
            identity: { verified_at: '2026-03-10T00:00:00.000Z' },
            application: {
                id: 'app-active',
                status: 'ACTIVE',
                current_step: 'ACTIVE',
                policy_version: ADMISSION_POLICY_VERSION,
                submitted_at: '2026-03-09T00:00:00.000Z',
                ai_review_started_at: '2026-03-09T00:05:00.000Z',
                ai_review_completed_at: '2026-03-09T00:06:00.000Z',
                human_review_started_at: null,
                human_review_completed_at: null,
                approved_at: '2026-03-09T00:07:00.000Z',
                rejected_at: null,
                rejection_reason_code: null,
                liveness_verified_at: '2026-03-09T00:01:00.000Z',
                soul_issued_at: '2026-03-09T00:08:00.000Z',
                activated_at: '2026-03-09T00:09:00.000Z',
            },
            documents: buildVerifiedRequiredDocuments(),
            consentEvents: buildGrantedConsents(),
            soulCredential: {
                id: 'soul-1',
                status: 'ISSUED',
                issued_at: '2026-03-09T00:08:00.000Z',
            },
        },
    }));

    assert.equal(response.stage, ADMISSION_STAGES.ACTIVE);
    assert.equal(response.blockers.length, 0);
    assert.equal(response.completed, true);
    assert.equal(response.meta.soul_credential_issued, true);
});

test('buildStatusResponse maps UNDER_REVIEW appeal state to canonical APPEAL_PENDING', () => {
    const response = buildStatusResponse(makeStatusInputs({
        truth: {
            ...makeStatusInputs().truth,
            identity: { verified_at: '2026-03-10T00:00:00.000Z' },
            application: {
                id: 'app-appeal',
                status: 'APPEAL_PENDING',
                current_step: 'APPEAL_PENDING',
                policy_version: ADMISSION_POLICY_VERSION,
                submitted_at: '2026-03-09T00:00:00.000Z',
                ai_review_started_at: '2026-03-09T00:05:00.000Z',
                ai_review_completed_at: '2026-03-09T00:06:00.000Z',
                human_review_started_at: '2026-03-10T00:01:00.000Z',
                human_review_completed_at: null,
                approved_at: null,
                rejected_at: '2026-03-09T00:07:00.000Z',
                rejection_reason_code: 'LOW_CONFIDENCE_EXCEPTION',
                liveness_verified_at: '2026-03-09T00:01:00.000Z',
                soul_issued_at: null,
                activated_at: null,
            },
            documents: buildVerifiedRequiredDocuments(),
            consentEvents: buildGrantedConsents(),
            latestAppeal: {
                id: 'appeal-1',
                status: 'UNDER_REVIEW',
                created_at: '2026-03-10T00:00:00.000Z',
                resolved_at: null,
            },
        },
    }));

    assert.equal(response.stage, ADMISSION_STAGES.APPEAL_PENDING);
    assert.equal(response.blockers.includes(STATUS_BLOCKER_CODES.APPEAL_PENDING), true);
    assert.equal(response.meta.appeal_status, 'UNDER_REVIEW');
});

test('buildStatusResponse maps manual review queue state to canonical EXCEPTION_REVIEW', () => {
    const response = buildStatusResponse(makeStatusInputs({
        truth: {
            ...makeStatusInputs().truth,
            identity: { verified_at: '2026-03-10T00:00:00.000Z' },
            application: {
                id: 'app-exception',
                status: 'EXCEPTION_REQUIRED',
                current_step: 'EXCEPTION_REVIEW',
                policy_version: ADMISSION_POLICY_VERSION,
                submitted_at: '2026-03-09T00:00:00.000Z',
                ai_review_started_at: '2026-03-09T00:05:00.000Z',
                ai_review_completed_at: '2026-03-09T00:06:00.000Z',
                human_review_started_at: '2026-03-10T00:01:00.000Z',
                human_review_completed_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_reason_code: 'LOW_CONFIDENCE_EXCEPTION',
                liveness_verified_at: '2026-03-09T00:01:00.000Z',
                soul_issued_at: null,
                activated_at: null,
            },
            documents: buildVerifiedRequiredDocuments(),
            consentEvents: buildGrantedConsents(),
            latestExceptionCase: {
                id: 'exception-1',
                status: 'UNDER_REVIEW',
                reason_code: 'LOW_CONFIDENCE_EXCEPTION',
                created_at: '2026-03-10T00:00:00.000Z',
                resolved_at: null,
            },
        },
    }));

    assert.equal(response.stage, ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.equal(response.blockers.includes(STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED), true);
    assert.equal(response.meta.exception_case_status, 'UNDER_REVIEW');
});
