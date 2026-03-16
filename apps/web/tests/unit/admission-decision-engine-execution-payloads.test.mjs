import assert from 'node:assert/strict';
import test from 'node:test';

const {
    buildApproveApplicationUpdate,
    buildApproveDocumentPatch,
    buildExceptionApplicationUpdate,
    buildExceptionDocumentPatch,
    buildRejectApplicationUpdate,
    buildRejectDocumentPatch,
    buildResubmitApplicationUpdate,
    buildResubmitDocumentPatch,
    resolveResubmitTargetDocumentTypes,
} = await import('../../lib/server/admission-decision-engine/execution-payloads.ts');

const nowIso = '2026-03-11T00:00:00.000Z';

test('document patch builders preserve execution payload semantics', () => {
    assert.deepEqual(
        buildApproveDocumentPatch({ nowIso, decisionNotes: 'AUTO:OK', reasonCode: 'AI_RULES_APPROVED' }),
        {
            upload_status: 'PURGED',
            processing_status: 'AI_PASSED',
            final_result: 'VERIFIED',
            human_result: 'AUTO:OK',
            file_storage_key_ephemeral: null,
            purged_at: nowIso,
            processed_at: nowIso,
        },
    );

    assert.deepEqual(
        buildExceptionDocumentPatch({ nowIso }),
        {
            upload_status: 'PURGED',
            file_storage_key_ephemeral: null,
            purged_at: nowIso,
            processed_at: nowIso,
        },
    );

    assert.deepEqual(
        buildRejectDocumentPatch({ nowIso, reasonCode: 'VERY_LOW_CONFIDENCE' }),
        {
            upload_status: 'PURGED',
            processing_status: 'AI_REJECTED',
            final_result: 'REJECTED',
            human_result: 'VERY_LOW_CONFIDENCE',
            file_storage_key_ephemeral: null,
            purged_at: nowIso,
            processed_at: nowIso,
        },
    );
});

test('resubmit target resolution keeps only supported docs and falls back to full required set', () => {
    const filtered = resolveResubmitTargetDocumentTypes([
        'INCOME_CERTIFICATE',
        'UNKNOWN_DOC',
    ]);

    assert.deepEqual(Array.from(filtered), ['INCOME_CERTIFICATE']);

    const fallback = resolveResubmitTargetDocumentTypes(['UNKNOWN_DOC']);
    assert.deepEqual(Array.from(fallback), [
        'GRADUATION_CERTIFICATE',
        'INCOME_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'FAMILY_RELATION_CERTIFICATE',
    ]);
});

test('resubmit patch marks targeted docs only', () => {
    const targetDocTypeSet = new Set(['INCOME_CERTIFICATE']);

    const targeted = buildResubmitDocumentPatch({
        doc: { document_type: 'INCOME_CERTIFICATE' },
        targetDocTypeSet,
        nowIso,
        reasonCode: 'LOW_CONFIDENCE_RESUBMIT',
    });

    const untargeted = buildResubmitDocumentPatch({
        doc: { document_type: 'MARRIAGE_CERTIFICATE' },
        targetDocTypeSet,
        nowIso,
        reasonCode: 'LOW_CONFIDENCE_RESUBMIT',
    });

    assert.equal(targeted.processing_status, 'RESUBMIT_REQUIRED');
    assert.equal(targeted.final_result, 'RESUBMIT_REQUIRED');
    assert.equal(untargeted.processing_status, 'AI_PASSED');
    assert.equal(untargeted.final_result, 'VERIFIED');
});

test('application update builders preserve decision state transitions', () => {
    assert.deepEqual(buildApproveApplicationUpdate(nowIso), {
        status: 'ACTIVE',
        current_step: 'ACTIVE',
        approved_at: nowIso,
        rejected_at: null,
        rejection_reason_code: null,
        ai_review_completed_at: nowIso,
        human_review_completed_at: null,
        soul_issued_at: nowIso,
        activated_at: nowIso,
    });

    assert.deepEqual(buildExceptionApplicationUpdate({ nowIso, reasonCode: 'LOW_CONFIDENCE_EXCEPTION' }), {
        status: 'EXCEPTION_REQUIRED',
        current_step: 'EXCEPTION_REVIEW',
        ai_review_completed_at: nowIso,
        rejection_reason_code: 'LOW_CONFIDENCE_EXCEPTION',
    });

    assert.deepEqual(buildRejectApplicationUpdate({ nowIso, reasonCode: 'VERY_LOW_CONFIDENCE' }), {
        status: 'REJECTED',
        current_step: 'REJECTED',
        rejected_at: nowIso,
        rejection_reason_code: 'VERY_LOW_CONFIDENCE',
        ai_review_completed_at: nowIso,
        approved_at: null,
        soul_issued_at: null,
        activated_at: null,
    });

    assert.deepEqual(buildResubmitApplicationUpdate({ nowIso, reasonCode: 'LOW_CONFIDENCE_RESUBMIT' }), {
        status: 'RESUBMIT_REQUIRED',
        current_step: 'RESUBMIT_REQUIRED',
        rejected_at: null,
        rejection_reason_code: 'LOW_CONFIDENCE_RESUBMIT',
        ai_review_completed_at: nowIso,
    });
});
