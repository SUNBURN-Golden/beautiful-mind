import test from 'node:test';
import assert from 'node:assert/strict';

const {
    buildDecisionInputSnapshot,
    resolvePolicyEvaluation,
    toPolicyDocs,
} = await import('../../lib/server/admission-decision-engine/policy.ts');
const { ADMISSION_POLICY_VERSION } = await import('../../lib/server/admission.ts');
const { STATUS_BLOCKER_CODES } = await import('../../lib/contracts/status-codes.ts');
const { STATUS_DECISION_REASON_CODES } = await import('../../lib/contracts/status-reasons.ts');

const thresholds = {
    aiConfidenceFloor: 0.68,
    exceptionConfidenceFloor: 0.45,
    hardRejectConfidenceCeiling: 0.2,
    auditSampleRate: 0.05,
};

function makeDocs() {
    return [
        {
            id: 'd1',
            document_type: 'GRADUATION_CERTIFICATE',
            upload_status: 'UPLOADED',
            processing_status: 'AI_PASSED',
            final_result: 'PENDING',
            ai_result: 'AI_PASS:GRADUATION_CERTIFICATE',
            ai_confidence: 0.9,
            file_storage_key_ephemeral: 'tmp/a',
            extracted_claims_json: { graduate_verified: true },
        },
    ];
}

test('toPolicyDocs strips storage/extracted payload to policy input shape', () => {
    const docs = makeDocs();
    const policyDocs = toPolicyDocs(docs);

    assert.equal(policyDocs.length, 1);
    assert.deepEqual(policyDocs[0], {
        id: 'd1',
        document_type: 'GRADUATION_CERTIFICATE',
        processing_status: 'AI_PASSED',
        final_result: 'PENDING',
        ai_result: 'AI_PASS:GRADUATION_CERTIFICATE',
        ai_confidence: 0.9,
    });
});

test('resolvePolicyEvaluation returns precondition RESUBMIT when identity/liveness/consent incomplete', () => {
    const result = resolvePolicyEvaluation({
        docs: makeDocs(),
        hasIdentity: false,
        hasLiveness: false,
        missingConsents: ['CONSENT_IDENTITY_DATA', 'CONSENT_LIVENESS_DATA'],
        thresholds,
        policyVersion: ADMISSION_POLICY_VERSION,
    });

    assert.equal(result.finalDecision, 'RESUBMIT_REQUIRED');
    assert.equal(result.reasonCode, STATUS_DECISION_REASON_CODES.PRECONDITION_INCOMPLETE);
    assert.ok(result.anomalyFlags.includes(STATUS_BLOCKER_CODES.IDENTITY_REQUIRED));
    assert.ok(result.anomalyFlags.includes(STATUS_BLOCKER_CODES.LIVENESS_REQUIRED));
    assert.ok(result.anomalyFlags.includes(STATUS_BLOCKER_CODES.CONSENTS_REQUIRED));
});

test('resolvePolicyEvaluation delegates to evaluator when preconditions are complete', () => {
    let called = false;
    const result = resolvePolicyEvaluation(
        {
            docs: makeDocs(),
            hasIdentity: true,
            hasLiveness: true,
            missingConsents: [],
            thresholds,
            policyVersion: ADMISSION_POLICY_VERSION,
        },
        (docs, inputThresholds, version) => {
            called = true;
            assert.equal(Array.isArray(docs), true);
            assert.equal(docs[0].document_type, 'GRADUATION_CERTIFICATE');
            assert.equal(inputThresholds.aiConfidenceFloor, thresholds.aiConfidenceFloor);
            assert.equal(version, ADMISSION_POLICY_VERSION);
            return {
                finalDecision: 'EXCEPTION_REQUIRED',
                reasonCode: 'TEST_EVAL',
                confidenceScore: 0.4,
                resubmitDocumentTypes: [],
                anomalyFlags: ['LOW_CONFIDENCE'],
                escalationReasonCode: 'LOW_CONFIDENCE',
                policyVersion: ADMISSION_POLICY_VERSION,
                policyThresholds: inputThresholds,
                ruleResults: { tested: true },
            };
        },
    );

    assert.equal(called, true);
    assert.equal(result.finalDecision, 'EXCEPTION_REQUIRED');
    assert.equal(result.reasonCode, 'TEST_EVAL');
});

test('buildDecisionInputSnapshot contains normalized policy docs and context fields', () => {
    const docs = makeDocs();
    const snapshot = buildDecisionInputSnapshot(
        {
            application: {
                id: 'app-1',
                user_id: 'user-1',
                status: 'PENDING',
                current_step: 'DOCUMENTS',
                policy_version: ADMISSION_POLICY_VERSION,
                liveness_verified_at: null,
                submitted_at: null,
                ai_review_started_at: null,
            },
            docs,
            hasIdentity: true,
            hasLiveness: false,
            missingConsents: ['CONSENT_AI_ANALYSIS'],
        },
        toPolicyDocs(docs),
    );

    assert.equal(snapshot.user_id, 'user-1');
    assert.equal(snapshot.application_id, 'app-1');
    assert.equal(snapshot.has_identity, true);
    assert.equal(snapshot.has_liveness, false);
    assert.deepEqual(snapshot.missing_consents, ['CONSENT_AI_ANALYSIS']);
    assert.equal(Array.isArray(snapshot.docs), true);
});
