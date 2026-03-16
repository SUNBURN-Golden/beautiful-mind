import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('review page keeps loading gate, active gate, and recoverable submit state', () => {
    const page = read('app/review/page.tsx');
    const hook = read('app/review/useReviewSubmission.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /title="Preparing your attestation workspace"/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /title="This area is available to ACTIVE members"/);

    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /title="We couldn’t submit your attestation"/);
    assert.match(page, /retryLabel="Try again"/);
    assert.match(hook, /submitTrustAttestation\(\{/);
});

test('review page keeps attestation hierarchy, calm action framing, and success reference block', () => {
    const page = read('app/review/page.tsx') + read('app/review/review-sections.tsx');

    assert.match(page, /Trust Attestation/);
    assert.match(page, /Start with the checklist below\./);
    assert.match(page, /Attestation Checklist/);
    assert.match(page, /Before you submit/);
    assert.match(page, /Record what you directly observed\./);
    assert.match(page, /Keep it factual\. No ratings, speculation, or character judgments\./);
    assert.match(page, /Type the confirmation phrase \(Required\)/);
    assert.match(page, /Submit Attestation/);

    assert.match(page, /Attestation submitted/);
    assert.match(page, /Reference/);
    assert.match(page, /Attestation ID/);
    assert.match(page, /Submitted/);
    assert.match(page, /Selected checks/);
    assert.match(page, /Follow-up/);
    assert.match(page, /Optional note/);
    assert.match(page, /SuccessNextStepPanel/);
});

test('report page keeps loading gate, active gate, and recoverable report state', () => {
    const page = read('app/report/ReportClient.tsx');
    const hook = read('app/report/useReportSubmission.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /title="Preparing the report workspace"/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /title="This area is available to ACTIVE members"/);

    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /title="We couldn’t submit your report"/);
    assert.match(page, /retryLabel="Try again"/);
    assert.match(hook, /submitIncidentReport\(\{/);
});

test('report page keeps factual framing, reference-detail hierarchy, and success next steps', () => {
    const page = read('app/report/ReportClient.tsx') + read('app/report/report-sections.tsx');

    assert.match(page, /Safety Report/);
    assert.match(page, /Start with the key facts\./);
    assert.match(page, /Linked context/);
    assert.match(page, /Conversation ID/);
    assert.match(page, /Accountability Notice \(Required\)/);
    assert.match(page, /Submit Report/);

    assert.match(page, /Your report was received/);
    assert.match(page, /Reference/);
    assert.match(page, /Incident ID/);
    assert.match(page, /Submitted/);
    assert.match(page, /Escalation queue/);
    assert.match(page, /Linked conversation/);
    assert.match(page, /SuccessNextStepPanel/);
});

test('revoke page keeps loading gate, active gate, and recoverable preference-update state', () => {
    const page = read('app/revoke/page.tsx');
    const hook = read('app/revoke/useRevokePreferences.ts');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /title="Preparing your preference controls"/);
    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /title="This area is available to ACTIVE members"/);

    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /title="We couldn’t submit your preference update"/);
    assert.match(page, /retryLabel="Try again"/);
    assert.match(hook, /submitParticipationRevoke\(\{/);
});

test('revoke page keeps preference hierarchy, calm framing, and reference-detail success block', () => {
    const page = read('app/revoke/page.tsx') + read('app/revoke/revoke-sections.tsx');

    assert.match(page, /Participation & Data Preferences/);
    assert.match(page, /Choose the preference change you want to make now\./);
    assert.match(page, /Pause participation/);
    assert.match(page, /Request data-processing withdrawal/);
    assert.match(page, /Save Preferences/);
    assert.match(page, /Choose at least one preference/);
    assert.match(page, /What happens next/);
    assert.match(page, /ACTIVE surfaces are hidden after the request is applied\./);
    assert.match(page, /Withdrawal requests may stay in review until legal and audit obligations are complete\./);

    assert.match(page, /Your preferences were recorded successfully\./);
    assert.match(page, /Reference/);
    assert.match(page, /Request ID/);
    assert.match(page, /Submitted/);
    assert.match(page, /Status/);
    assert.match(page, /Conversations hidden/);
    assert.match(page, /SuccessNextStepPanel/);
});
