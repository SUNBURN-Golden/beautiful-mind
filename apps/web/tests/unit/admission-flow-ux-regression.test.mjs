import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('apply start page keeps loading, wrong-stage redirect notice, retry recovery, and next-step CTA', () => {
    const page = read('app/(guarded)/apply/page.tsx');
    const hook = read('app/(guarded)/apply/useApplyStart.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Start again"/);
    assert.match(page, /SuccessNextStepPanel/);
    assert.match(page, /primaryHref="\/apply\/identity"/);
    assert.match(hook, /startAdmissionApplication\(/);
    assert.match(hook, /await refetch\(\)/);
});

test('identity page keeps provider-session handoff, fallback recovery, and callback CTA', () => {
    const page = read('app/(guarded)/apply/identity/page.tsx');
    const hook = read('app/(guarded)/apply/identity/useIdentitySession.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Dismiss"/);
    assert.match(page, /primaryHref="\/apply\/identity\/callback"/);
    assert.match(hook, /startIdentityVerificationSession\(/);
    assert.match(hook, /window\.location\.assign\(session\.session\.handoff_url\)/);
});

test('liveness page keeps camera capture contract, retry recovery, and callback CTA', () => {
    const page = read('app/(guarded)/apply/liveness/page.tsx');
    const hook = read('app/(guarded)/apply/liveness/useLivenessFlow.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Dismiss"/);
    assert.match(page, /primaryHref="\/apply\/liveness\/callback"/);
    assert.match(hook, /navigator\.mediaDevices\.getUserMedia/);
    assert.match(hook, /startLivenessVerificationSession\(/);
    assert.match(hook, /completeLivenessVerificationSession\(/);
});

test('consents page keeps loading, wrong-stage notice, and strict submit gating before next-step CTA', () => {
    const page = read('app/(guarded)/apply/consents/page.tsx');
    const hook = read('app/(guarded)/apply/consents/useApplyConsents.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /ConsentChecklistSection/);
    assert.match(page, /disabled=\{submitting \|\| !allChecked \|\| !allPhrasesValid\}/);
    assert.match(page, /SuccessNextStepPanel/);
    assert.match(page, /primaryHref="\/apply\/documents"/);
    assert.match(hook, /submitAdmissionConsents\(/);
});

test('documents page keeps resubmit recovery branch, retry sync path, and status/review CTAs', () => {
    const page = read('app/(guarded)/apply/documents/page.tsx');
    const hook = read('app/(guarded)/apply/documents/useAdmissionDocuments.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /!?\['DOCUMENTS', 'RESUBMIT_REQUIRED'\]\.includes\(stage\)/);
    assert.match(page, /A resubmission is required/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Refresh status"/);
    assert.match(page, /primaryHref="\/apply\/status"/);
    assert.match(page, /secondaryHref="\/apply\/review"/);
    assert.match(hook, /await refetch\(\)/);
});

test('review page keeps AI decision retry path, wrong-stage notice, and status CTA', () => {
    const page = read('app/(guarded)/apply/review/page.tsx');
    const hook = read('app/(guarded)/apply/review/useApplyReview.ts');
    const sections = read('app/(guarded)/apply/review/review-sections.tsx');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /ApplyReviewSignalsSection/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Run again"/);
    assert.match(page, /onRetry=\{retrySubmit\}/);
    assert.match(hook, /triggerAdmissionDecision\(/);
    assert.match(sections, /primaryHref="\/apply\/status"/);
});

test('status page keeps polling, manual refresh recovery, blocker actions, and active success CTA', () => {
    const page = read('app/(guarded)/apply/status/page.tsx');
    const hook = read('app/(guarded)/apply/status/useApplyStatusView.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Refresh status"/);
    assert.match(page, /onClick=\{\(\) => void refetch\(\)\}/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /SuccessNextStepPanel/);
    assert.match(page, /primaryHref="\/dashboard"/);
    assert.match(hook, /useStatus\(\{\s*refreshIntervalMs: 5000,\s*\}\)/);
    assert.match(hook, /getStatusRecoveryActions\(/);
    assert.match(hook, /getStatusBlockerCopy\(/);
    assert.match(hook, /getStatusDecisionReasonCopy\(/);
    assert.match(hook, /map\(formatDocumentTypeLabel\)/);
    assert.match(hook, /map\(formatConsentTypeLabel\)/);
});

test('appeal page keeps wrong-stage guard, status-load retry recovery, and submit success transition', () => {
    const page = read('app/(guarded)/apply/appeal/page.tsx');
    const hook = read('app/(guarded)/apply/appeal/useApplyAppeal.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /AppealFormSection/);
    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /retryLabel="Retry check"/);
    assert.match(page, /SuccessNextStepPanel/);
    assert.match(page, /primaryHref="\/apply\/status"/);
    assert.match(hook, /fetchAdmissionAppealStatus\(/);
    assert.match(hook, /createAdmissionAppeal\(/);
});
