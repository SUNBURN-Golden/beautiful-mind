import assert from 'node:assert/strict';
import test from 'node:test';

const { ADMISSION_STAGES, LEGACY_ADMISSION_STAGE_CODES } = await import('../../lib/contracts/status-stages.ts');
const {
    parseStatusContract,
    parseStatusErrorCode,
    getStatusStage,
} = await import('../../lib/contracts/status-contract.ts');

test('parseStatusContract normalizes server stage into stage+step compatibility fields', () => {
    const status = parseStatusContract({
        stage: ADMISSION_STAGES.DOCUMENTS,
        blockers: ['DOCUMENTS_REQUIRED'],
        meta: { schema_version: 2 },
        details: { missing_document_types: ['INCOME_CERTIFICATE'] },
    });

    assert.equal(status.stage, ADMISSION_STAGES.DOCUMENTS);
    assert.equal(status.step, ADMISSION_STAGES.DOCUMENTS);
    assert.equal(status.error, null);
    assert.deepEqual(status.blockers, ['DOCUMENTS_REQUIRED']);
    assert.deepEqual(status.details?.missing_document_types, ['INCOME_CERTIFICATE']);
});

test('parseStatusContract keeps legacy aliases compatible for old step values', () => {
    const status = parseStatusContract({
        step: LEGACY_ADMISSION_STAGE_CODES.HUMAN_REVIEW,
        blockers: [],
    });

    assert.equal(status.stage, ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.equal(status.step, ADMISSION_STAGES.EXCEPTION_REVIEW);
});

test('parseStatusErrorCode resolves nested code/message formats', () => {
    assert.equal(parseStatusErrorCode({ error: 'AUTH_REQUIRED' }), 'AUTH_REQUIRED');
    assert.equal(parseStatusErrorCode({ error: { code: 'BANNED' } }), 'BANNED');
    assert.equal(parseStatusErrorCode({ error: { message: 'TOKEN_EXPIRED' } }), 'TOKEN_EXPIRED');
    assert.equal(parseStatusErrorCode({}), 'STATUS_FETCH_FAILED');
});

test('getStatusStage resolves stage/step fallback without route-level duplication', () => {
    assert.equal(getStatusStage({ stage: ADMISSION_STAGES.ACTIVE }), ADMISSION_STAGES.ACTIVE);
    assert.equal(getStatusStage({ step: LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW }), ADMISSION_STAGES.AI_DECISION);
    assert.equal(getStatusStage(null), null);
});
