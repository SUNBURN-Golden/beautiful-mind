import test from 'node:test';
import assert from 'node:assert/strict';

const { evaluateAdmissionPolicy } = await import('../../lib/server/admission-policy.ts');
const { ADMISSION_POLICY_VERSION } = await import('../../lib/server/admission.ts');

const thresholds = {
    aiConfidenceFloor: 0.68,
    exceptionConfidenceFloor: 0.45,
    hardRejectConfidenceCeiling: 0.2,
    auditSampleRate: 0.05,
};

function baseDocs(confidence = 0.9) {
    return [
        {
            id: '1',
            document_type: 'GRADUATION_CERTIFICATE',
            processing_status: 'AI_PASSED',
            final_result: 'PENDING',
            ai_result: 'AI_PASS:GRADUATION_CERTIFICATE',
            ai_confidence: confidence,
        },
        {
            id: '2',
            document_type: 'INCOME_CERTIFICATE',
            processing_status: 'AI_PASSED',
            final_result: 'PENDING',
            ai_result: 'AI_PASS:INCOME_CERTIFICATE',
            ai_confidence: confidence,
        },
        {
            id: '3',
            document_type: 'MARRIAGE_CERTIFICATE',
            processing_status: 'AI_PASSED',
            final_result: 'PENDING',
            ai_result: 'AI_PASS:MARRIAGE_CERTIFICATE',
            ai_confidence: confidence,
        },
        {
            id: '4',
            document_type: 'FAMILY_RELATION_CERTIFICATE',
            processing_status: 'AI_PASSED',
            final_result: 'PENDING',
            ai_result: 'AI_PASS:FAMILY_RELATION_CERTIFICATE',
            ai_confidence: confidence,
        },
    ];
}

test('policy engine approves high confidence complete set', () => {
    const result = evaluateAdmissionPolicy(baseDocs(0.87), thresholds);
    assert.equal(result.finalDecision, 'APPROVE');
    assert.equal(result.reasonCode, 'AI_RULES_APPROVED');
    assert.equal(result.policyVersion, ADMISSION_POLICY_VERSION);
});

test('policy engine routes exception on low confidence anomaly band', () => {
    const result = evaluateAdmissionPolicy(baseDocs(0.4), thresholds);
    assert.equal(result.finalDecision, 'EXCEPTION_REQUIRED');
    assert.equal(result.reasonCode, 'LOW_CONFIDENCE_EXCEPTION');
});

test('policy engine rejects on hard reject signal', () => {
    const docs = baseDocs(0.81);
    docs[1].ai_result = 'AUTO_REJECT:FORGED';
    docs[1].ai_confidence = 0.1;

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'REJECT');
    assert.equal(result.reasonCode, 'AI_HARD_REJECT_SIGNAL');
});

test('policy engine requests resubmit when required docs are missing', () => {
    const docs = baseDocs(0.81).slice(0, 3);
    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'RESUBMIT_REQUIRED');
    assert.equal(result.reasonCode, 'MISSING_REQUIRED_DOCUMENTS');
    assert.ok(result.resubmitDocumentTypes.includes('FAMILY_RELATION_CERTIFICATE'));
});

test('policy engine triggers explicit resubmit path from doc status flags', () => {
    const docs = baseDocs(0.85);
    docs[2].final_result = 'RESUBMIT_REQUIRED';

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'RESUBMIT_REQUIRED');
    assert.equal(result.reasonCode, 'DOCS_FLAGGED_FOR_RESUBMIT');
    assert.deepEqual(result.resubmitDocumentTypes, ['MARRIAGE_CERTIFICATE']);
});

test('policy engine triggers processing-incomplete resubmit path', () => {
    const docs = baseDocs(0.85);
    docs[0].processing_status = 'AI_PENDING';

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'RESUBMIT_REQUIRED');
    assert.equal(result.reasonCode, 'AI_PROCESSING_INCOMPLETE');
    assert.ok(result.resubmitDocumentTypes.includes('GRADUATION_CERTIFICATE'));
});

test('hard reject signal respects confidence ceiling threshold boundary', () => {
    const docs = baseDocs(0.85);
    docs[1].ai_result = 'AUTO_REJECT:FORGED';
    docs[1].ai_confidence = 0.21;

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'EXCEPTION_REQUIRED');
    assert.equal(result.reasonCode, 'LOW_CONFIDENCE_EXCEPTION');
});

test('very low confidence without hard signal rejects', () => {
    const docs = baseDocs(0.85);
    docs[3].ai_confidence = 0.2;

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'REJECT');
    assert.equal(result.reasonCode, 'VERY_LOW_CONFIDENCE');
});

test('policy engine routes conflict markers to exception review before threshold branches', () => {
    const docs = baseDocs(0.9);
    docs[0].ai_result = 'ANOMALY:NAME_CONFLICT';

    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'EXCEPTION_REQUIRED');
    assert.equal(result.reasonCode, 'CROSS_DOCUMENT_CONFLICT');
    assert.ok(result.anomalyFlags.includes('CROSS_DOCUMENT_CONFLICT'));
});

test('policy engine requests resubmit when confidence is below ai floor but above exception floor', () => {
    const docs = baseDocs(0.6);
    const result = evaluateAdmissionPolicy(docs, thresholds);
    assert.equal(result.finalDecision, 'RESUBMIT_REQUIRED');
    assert.equal(result.reasonCode, 'LOW_CONFIDENCE_RESUBMIT');
    assert.deepEqual(result.resubmitDocumentTypes.sort(), [
        'FAMILY_RELATION_CERTIFICATE',
        'GRADUATION_CERTIFICATE',
        'INCOME_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
    ]);
});
