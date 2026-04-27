import assert from 'node:assert/strict';
import test from 'node:test';

const { ADMISSION_STAGES } = await import('../../lib/contracts/status-stages.ts');
const { STATUS_BLOCKER_CODES } = await import('../../lib/contracts/status-codes.ts');
const { STATUS_DECISION_REASON_CODES } = await import('../../lib/contracts/status-reasons.ts');
const {
    formatConsentTypeLabel,
    formatConsentTypeLabelForLocale,
    formatActionLabel,
    formatAdmissionStatusLabel,
    formatContractIdentifierLabel,
    formatDocumentTypeLabel,
    formatDocumentTypeLabelForLocale,
    formatProcessingStateLabel,
    formatStandingStatusLabel,
    formatTrustLevelLabel,
    formatUnavailableReasonLabel,
    getKnownStatusBlockerCodes,
    getStatusBlockerCopy,
    getStatusBlockerCopyForLocale,
    getStatusDecisionReasonCopy,
    getStatusDecisionReasonCopyForLocale,
    getStatusErrorCopy,
    getStatusErrorCopyForLocale,
    getStatusRecoveryActions,
    getStatusStageCopy,
    getStatusStageCopyForLocale,
    normalizeStatusCopyLocale,
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

test('locale-aware helpers preserve Korean defaults and add English labels', () => {
    assert.equal(normalizeStatusCopyLocale('en'), 'en');
    assert.equal(normalizeStatusCopyLocale('ko'), 'ko');
    assert.equal(normalizeStatusCopyLocale('fr'), 'ko');

    assert.equal(
        getStatusStageCopyForLocale(ADMISSION_STAGES.ACTIVE, 'en').label,
        'Active user status',
    );
    assert.equal(
        getStatusStageCopyForLocale(ADMISSION_STAGES.ACTIVE, 'ko').label,
        '활성 사용자 상태',
    );

    const blocker = getStatusBlockerCopyForLocale(STATUS_BLOCKER_CODES.DOCUMENTS_REQUIRED, 'en');
    assert.equal(blocker.title, 'Official documents required');
    assert.equal(blocker.action?.label, 'Submit documents');

    assert.equal(
        getStatusDecisionReasonCopyForLocale(STATUS_DECISION_REASON_CODES.MISSING_REQUIRED_DOCUMENTS, 'en'),
        'Required documents are missing, so resubmission is needed.',
    );
    assert.equal(getStatusErrorCopyForLocale('AUTH_REQUIRED', 'en').title, 'Sign in required.');
});

test('ordinary locale-aware fallbacks do not expose raw enum or internal identifiers', () => {
    assert.equal(formatDocumentTypeLabelForLocale('UNKNOWN_DOC', 'en'), 'Other document type');
    assert.equal(formatDocumentTypeLabelForLocale('UNKNOWN_DOC', 'ko'), '기타 문서 유형');
    assert.equal(formatConsentTypeLabelForLocale('UNKNOWN_CONSENT', 'en'), 'Other consent record');
    assert.equal(formatProcessingStateLabel('AI_PASSED', 'en'), 'AI review passed');
    assert.equal(formatProcessingStateLabel('UNKNOWN_STATE', 'en'), 'Other review state');
    assert.equal(formatProcessingStateLabel('UNKNOWN_STATE', 'ko'), '기타 검토 상태');

    const unknownBlocker = getStatusBlockerCopyForLocale('UNEXPECTED_BLOCKER', 'en');
    assert.equal(unknownBlocker.title, 'Additional review required');
    assert.doesNotMatch(unknownBlocker.title, /UNEXPECTED_BLOCKER/);

    assert.equal(getStatusDecisionReasonCopyForLocale('UNMAPPED_REASON', 'en'), 'Additional review required');
    assert.equal(getStatusErrorCopyForLocale('RANDOM_ERROR', 'en').message.includes('RANDOM_ERROR'), false);
});

test('new mapping domains cover statuses, actions, and contract identifiers', () => {
    assert.equal(formatAdmissionStatusLabel('ADMISSION_VERIFIED', 'en'), 'Admission verified');
    assert.equal(formatStandingStatusLabel('ACTIVE', 'ko'), '활성 standing');
    assert.equal(formatTrustLevelLabel('ADMISSION_VERIFIED', 'en'), 'Admission verified');
    assert.equal(formatActionLabel('SUBMIT', 'ko'), '제출');
    assert.equal(formatUnavailableReasonLabel('ACCOUNT_FROZEN', 'en'), 'Account frozen');

    assert.equal(
        formatContractIdentifierLabel('identity.active', 'en'),
        'Identity verification record',
    );
    assert.equal(
        formatContractIdentifierLabel('documents.4.verified', 'ko'),
        '필수 문서 검증 기록',
    );
    assert.equal(
        formatContractIdentifierLabel('consent.recorded', 'en'),
        'Consent record',
    );
    assert.equal(
        formatContractIdentifierLabel('credential.active', 'ko'),
        '활성 자격증명 기록',
    );
    assert.equal(
        formatContractIdentifierLabel('dashboard.access-board.v1', 'en'),
        'Access board record',
    );
    assert.equal(
        formatContractIdentifierLabel('stage5.landing.invitation.v1', 'ko'),
        'Landing invitation 기록',
    );
    assert.equal(
        formatContractIdentifierLabel('standing-active', 'en'),
        'Active standing record',
    );
    assert.equal(
        formatContractIdentifierLabel('standing:active:admission-verified:active', 'ko'),
        '활성 입장 standing 기록',
    );
});

test('support and diagnostic fallbacks preserve auditability for new helpers', () => {
    assert.match(
        formatDocumentTypeLabelForLocale('UNKNOWN_DOC', 'ko', { audience: 'support' }),
        /문서 코드 \(UNKNOWN_DOC\)/,
    );
    assert.match(
        formatConsentTypeLabelForLocale('UNKNOWN_CONSENT', 'ko', { audience: 'diagnostic' }),
        /동의 코드 \(UNKNOWN_CONSENT\)/,
    );
    assert.match(
        formatContractIdentifierLabel('unknown.contract.v1', 'en', { audience: 'support' }),
        /Contract reference \(unknown\.contract\.v1\)/,
    );
});
