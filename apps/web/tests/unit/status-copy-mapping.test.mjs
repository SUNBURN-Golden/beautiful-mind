import assert from 'node:assert/strict';
import test from 'node:test';

const { ADMISSION_STAGES } = await import('../../lib/contracts/status-stages.ts');
const { STATUS_BLOCKER_CODES } = await import('../../lib/contracts/status-codes.ts');
const { STATUS_DECISION_REASON_CODES } = await import('../../lib/contracts/status-reasons.ts');
const {
    formatConsentTypeLabel,
    formatDocumentTypeLabel,
    getKnownStatusBlockerCodes,
    getStatusBlockerCopy,
    getStatusDecisionReasonCopy,
    getStatusErrorCopy,
    getStatusRecoveryActions,
    getStatusStageCopy,
} = await import('../../lib/contracts/status-copy.ts');

test('known blocker codes map to stable copy and recovery actions', () => {
    const copy = getStatusBlockerCopy(STATUS_BLOCKER_CODES.LIVENESS_REQUIRED);
    assert.equal(copy.title, '실재 인물 검증 필요');
    assert.equal(copy.action?.href, '/apply/liveness');
    assert.equal(copy.action?.label, '실재 인물 검증 진행');

    const actions = getStatusRecoveryActions([
        STATUS_BLOCKER_CODES.LIVENESS_REQUIRED,
        STATUS_BLOCKER_CODES.CONSENTS_REQUIRED,
        STATUS_BLOCKER_CODES.LIVENESS_REQUIRED,
    ]);
    assert.deepEqual(actions, [
        { href: '/apply/liveness', label: '실재 인물 검증 진행' },
        { href: '/apply/consents', label: '동의 항목 제출' },
    ]);
});

test('state-driven stage and blocker copy stay aligned for core product states', () => {
    const activeStage = getStatusStageCopy(ADMISSION_STAGES.ACTIVE);
    assert.equal(activeStage.label, '활성 사용자 상태');
    assert.deepEqual(getStatusRecoveryActions([]), []);

    const rejectedStage = getStatusStageCopy(ADMISSION_STAGES.REJECTED);
    assert.equal(rejectedStage.label, '심사 거절');
    const rejectedBlocker = getStatusBlockerCopy(STATUS_BLOCKER_CODES.ADMISSION_REJECTED);
    assert.equal(rejectedBlocker.action?.href, '/apply/appeal');
    assert.equal(rejectedBlocker.action?.label, '이의제기 제출');

    const resubmitStage = getStatusStageCopy(ADMISSION_STAGES.RESUBMIT_REQUIRED);
    assert.equal(resubmitStage.label, '문서 재제출 필요');
    const resubmitBlocker = getStatusBlockerCopy(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED);
    assert.equal(resubmitBlocker.action?.href, '/apply/documents');

    const appealStage = getStatusStageCopy(ADMISSION_STAGES.APPEAL_PENDING);
    assert.equal(appealStage.label, '이의제기 처리 중');
    const appealBlocker = getStatusBlockerCopy(STATUS_BLOCKER_CODES.APPEAL_PENDING);
    assert.equal(appealBlocker.action?.href, '/apply/status');

    const manualReviewStage = getStatusStageCopy(ADMISSION_STAGES.EXCEPTION_REVIEW);
    assert.equal(manualReviewStage.label, '예외 검토 큐');
    const manualReviewBlocker = getStatusBlockerCopy(STATUS_BLOCKER_CODES.EXCEPTION_REVIEW_REQUIRED);
    assert.equal(manualReviewBlocker.action?.href, '/apply/status');
});

test('unknown blocker code degrades gracefully with a safe fallback action', () => {
    const unknown = getStatusBlockerCopy('UNEXPECTED_BLOCKER');
    assert.match(unknown.title, /알 수 없는 blocker/);
    assert.equal(unknown.action?.href, '/apply/status');
    assert.equal(unknown.action?.label, '상태 페이지 확인');
});

test('stage and reason copy maps are code-driven with unknown-code fallback', () => {
    const knownStage = getStatusStageCopy(ADMISSION_STAGES.RESUBMIT_REQUIRED);
    assert.equal(knownStage.label, '문서 재제출 필요');
    assert.equal(knownStage.progressStep, 4);

    const unknownStage = getStatusStageCopy('FUTURE_STAGE');
    assert.match(unknownStage.label, /상태 코드 \(FUTURE_STAGE\)/);

    assert.equal(
        getStatusDecisionReasonCopy(STATUS_DECISION_REASON_CODES.MISSING_REQUIRED_DOCUMENTS),
        '필수 문서가 누락되어 재제출이 필요합니다.',
    );
    assert.match(
        getStatusDecisionReasonCopy('UNMAPPED_REASON'),
        /정의되지 않은 결정 사유 \(UNMAPPED_REASON\)/,
    );
});

test('error, document, and consent copy helpers provide useful recovery guidance', () => {
    const authError = getStatusErrorCopy('AUTH_REQUIRED');
    assert.equal(authError.title, '로그인이 필요합니다.');
    assert.match(authError.message, /다시 로그인/);

    const unknownError = getStatusErrorCopy('RANDOM_ERROR');
    assert.match(unknownError.message, /오류 코드 \(RANDOM_ERROR\)/);

    assert.equal(formatDocumentTypeLabel('GRADUATION_CERTIFICATE'), '졸업증명서');
    assert.match(formatDocumentTypeLabel('UNKNOWN_DOC'), /문서 코드 \(UNKNOWN_DOC\)/);

    assert.equal(formatConsentTypeLabel('LIVENESS_HANDLING'), '실재인물 검증 처리 동의');
    assert.match(formatConsentTypeLabel('UNKNOWN_CONSENT'), /동의 코드 \(UNKNOWN_CONSENT\)/);
});

test('known blocker code registry stays explicit and non-empty', () => {
    const knownCodes = getKnownStatusBlockerCodes();
    assert.equal(Array.isArray(knownCodes), true);
    assert.equal(knownCodes.length > 0, true);
    assert.equal(knownCodes.includes(STATUS_BLOCKER_CODES.APPLICATION_NOT_STARTED), true);
    assert.equal(knownCodes.includes(STATUS_BLOCKER_CODES.ACCOUNT_FROZEN), true);
});
