import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { STATUS_BLOCKER_CODES } from '../../lib/contracts/status-codes';
import { ADMISSION_STAGES } from '../../lib/contracts/status-stages';

dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: '.env.local' });

type E2ECreds = {
    user_id: string;
};

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactNames(...names: string[]) {
    return new RegExp(`^(?:${names.map(escapeRegExp).join('|')})$`);
}

const CONSENT_PHRASES = [
    'I ACKNOWLEDGE IDENTITY HANDLING',
    'I ACKNOWLEDGE LIVENESS HANDLING',
    'I ACKNOWLEDGE EDUCATION DOCUMENT HANDLING',
    'I ACKNOWLEDGE INCOME DOCUMENT HANDLING',
    'I ACKNOWLEDGE MARITAL FAMILY DOCUMENT HANDLING',
    'I ACKNOWLEDGE AI ASSISTED ANALYSIS',
    'I ACKNOWLEDGE HUMAN EXCEPTION AUDIT APPEAL REVIEW',
    'I ACKNOWLEDGE IMMEDIATE PURGE AND MINIMAL RETENTION',
];

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(supabaseUrl, serviceRoleKey);
}

function readE2ECreds(): E2ECreds {
    const credsPath = path.resolve(process.cwd(), '.e2e/creds.auth.stateful.json');
    if (!fs.existsSync(credsPath)) {
        throw new Error(
            [
                '[E2E_STATEFUL_CREDS_MISSING] Missing stateful auth creds.',
                `Expected file: ${credsPath}`,
                'Run scripts/remote_e2e_seed.mjs to generate isolated auth-lane users.',
            ].join('\n'),
        );
    }
    const raw = fs.readFileSync(credsPath, 'utf8');
    return JSON.parse(raw) as E2ECreds;
}

async function resetAdmissionState(userId: string) {
    const admin = getAdminClient();
    const nowIso = new Date().toISOString();

    const assertNoError = (label: string, error: { message?: string } | null) => {
        if (error) {
            throw new Error(`${label} failed: ${error.message || 'unknown error'}`);
        }
    };

    const { data: caseRows } = await admin
        .from('review_cases')
        .select('id')
        .eq('user_id', userId);

    const reviewCaseIds = (caseRows || []).map((row) => row.id);
    if (reviewCaseIds.length > 0) {
        const { error } = await admin
            .from('review_case_events')
            .delete()
            .in('review_case_id', reviewCaseIds);
        assertNoError('delete review_case_events', error);
    }

    {
        const { error } = await admin.from('review_cases').delete().eq('user_id', userId);
        assertNoError('delete review_cases', error);
    }
    {
        const { error } = await admin.from('consent_events').delete().eq('user_id', userId);
        assertNoError('delete consent_events', error);
    }
    {
        const { error } = await admin.from('verified_claims').delete().eq('user_id', userId);
        assertNoError('delete verified_claims', error);
    }
    {
        const { error } = await admin.from('admission_decision_runs').delete().eq('user_id', userId);
        assertNoError('delete admission_decision_runs', error);
    }
    {
        const { error } = await admin.from('appeals').delete().eq('user_id', userId);
        assertNoError('delete appeals', error);
    }
    {
        const { error } = await admin.from('exception_cases').delete().eq('user_id', userId);
        assertNoError('delete exception_cases', error);
    }
    {
        const { error } = await admin.from('audit_samples').delete().eq('user_id', userId);
        assertNoError('delete audit_samples', error);
    }
    {
        const { error } = await admin.from('admission_document_submissions').delete().eq('user_id', userId);
        assertNoError('delete admission_document_submissions', error);
    }
    {
        const { error } = await admin
            .from('admission_applications')
            .update({
                status: 'IN_PROGRESS',
                current_step: 'APPLY_START',
                submitted_at: null,
                ai_review_started_at: null,
                ai_review_completed_at: null,
                human_review_started_at: null,
                human_review_completed_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_reason_code: null,
                liveness_verified_at: null,
                soul_issued_at: null,
                activated_at: null,
                updated_at: nowIso,
            })
            .eq('user_id', userId);
        assertNoError('reset admission_applications', error);
    }
    {
        const { error } = await admin.from('identity_claims').delete().eq('user_id', userId);
        assertNoError('delete identity_claims', error);
    }
    {
        const { error } = await admin
            .from('soul_credentials')
            .update({
                status: 'REVOKED',
                revoked_at: nowIso,
                updated_at: nowIso,
            })
            .eq('user_id', userId);
        assertNoError('revoke soul_credentials', error);
    }
    {
        const { error } = await admin
            .from('sbt_claims')
            .update({
                status: 'REVOKED',
                revoked_at: nowIso,
                updated_at: nowIso,
            })
            .eq('user_id', userId)
            .in('claim_type', ['ADMISSION_SOUL', 'SOUL_TRUST']);
        assertNoError('revoke sbt_claims', error);
    }

    {
        const { error } = await admin
        .from('profiles')
        .update({
            verified: false,
            banned: false,
            is_frozen: false,
            freeze_reason: null,
            is_admin: false,
        })
        .eq('id', userId);
        assertNoError('reset profiles', error);
    }
}

async function fetchStatus(page: Page) {
    return await page.evaluate(async () => {
        const res = await fetch('/api/me/status', { cache: 'no-store' });
        return await res.json();
    });
}

async function waitForAuthoritativeActiveStatus(page: Page) {
    await expect.poll(async () => {
        const status = await fetchStatus(page);
        return {
            step: status?.step ?? null,
            blockerCount: Array.isArray(status?.blockers) ? status.blockers.length : -1,
            soulCredentialIssued: status?.meta?.soul_credential_issued === true,
        };
    }, {
        timeout: 120000,
        intervals: [1000, 2000, 5000],
    }).toEqual({
        step: ADMISSION_STAGES.ACTIVE,
        blockerCount: 0,
        soulCredentialIssued: true,
    });
}

async function expectDashboardActiveSurface(page: Page) {
    await page.goto('/dashboard');

    await expect.poll(async () => {
        const status = await fetchStatus(page);
        const headingVisible = await page.getByRole('heading', { name: 'Control Center' }).isVisible().catch(() => false);
        const bodyText = await page.locator('body').textContent().catch(() => '');

        return {
            urlMatches: /\/dashboard(\?.*)?$/.test(page.url()),
            headingVisible,
            apiStep: status?.step ?? null,
            soulCredentialIssued: status?.meta?.soul_credential_issued === true,
            bodyHasActiveLedger: bodyText.includes('Ledger Status') && bodyText.includes(ADMISSION_STAGES.ACTIVE),
            bodyHasIssuedCredential: bodyText.includes('Credential') && bodyText.includes('ISSUED'),
        };
    }, {
        timeout: 60000,
        intervals: [1000, 2000, 5000],
    }).toEqual({
        urlMatches: true,
        headingVisible: true,
        apiStep: ADMISSION_STAGES.ACTIVE,
        soulCredentialIssued: true,
        bodyHasActiveLedger: true,
        bodyHasIssuedCredential: true,
    });
}

async function completeIdentity(page: Page) {
    await page.goto('/apply/identity');

    const sessionStartUrlPattern = '**/api/admission/identity/session/start';
    let sessionStartPayload;
    const forceIdentityTestRedirect = async (route) => {
        const upstream = await route.fetch();
        const upstreamPayload = await upstream.json().catch(() => null);

        if (!upstream.ok || !upstreamPayload || typeof upstreamPayload !== 'object') {
            await route.fulfill({ response: upstream });
            return;
        }

        const payload = upstreamPayload;
        if (!payload.session || typeof payload.session.redirect_url !== 'string') {
            await route.fulfill({ response: upstream });
            return;
        }

        const backendUrl = new URL(payload.session.redirect_url);
        const safeHandoffUrl = new URL(backendUrl.pathname, page.url());
        safeHandoffUrl.searchParams.set('identityVerificationId', 'mock_success');

        sessionStartPayload = {
            ...upstreamPayload,
            session: {
                ...payload.session,
                mode: 'TEST_REDIRECT',
                handoff_url: safeHandoffUrl.toString(),
            },
        };

        await route.fulfill({
            status: upstream.status(),
            headers: {
                ...upstream.headers(),
                'content-type': 'application/json',
            },
            body: JSON.stringify(sessionStartPayload),
        });
    };

    await page.route(sessionStartUrlPattern, forceIdentityTestRedirect);
    try {
        const startSessionResponse = page.waitForResponse((response) => (
            response.request().method() === 'POST'
            && response.url().includes('/api/admission/identity/session/start')
        ), { timeout: 60000 });

        await page.locator('form button[type="submit"]').click();

        const sessionStartResult = await startSessionResponse;
        expect(sessionStartResult.ok()).toBeTruthy();
        
        // Wait briefly for the route handler to finish populating sessionStartPayload
        await expect.poll(() => sessionStartPayload, { timeout: 10000 }).toBeTruthy();

        expect(sessionStartPayload?.session?.mode).toBe('TEST_REDIRECT');
        expect(typeof sessionStartPayload?.session?.handoff_url).toBe('string');

        await expect.poll(() => page.url(), {
            timeout: 60000,
            intervals: [500, 1000, 2000],
        }).toMatch(/\/apply\/(identity\/callback|liveness)(\?.*)?$/);

        await expect.poll(async () => {
            const status = await fetchStatus(page);
            return status.step;
        }, {
            timeout: 60000,
            intervals: [1000, 2000, 5000],
        }).toBe(ADMISSION_STAGES.LIVENESS);
    } finally {
        await page.unroute(sessionStartUrlPattern, forceIdentityTestRedirect);
    }
}

async function completeLiveness(page: Page) {
    await page.goto('/apply/liveness');

    const startSessionResponse = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().includes('/api/admission/liveness/session/start')
    ), { timeout: 60000 });

    await page.locator('form button[type="submit"]').click();
    const startedSessionResult = await startSessionResponse;
    expect(startedSessionResult.ok()).toBeTruthy();

    const startedPayload = await startedSessionResult.json();
    const sessionId = typeof startedPayload?.session?.session_id === 'string'
        ? startedPayload.session.session_id
        : null;
    expect(sessionId).toBeTruthy();
    if (!sessionId) {
        throw new Error('LIVENESS_SESSION_ID_MISSING');
    }

    const completeResponse = await page.request.post('/api/admission/liveness/session/complete', {
        data: {
            session_id: sessionId,
            capture_hash: 'f'.repeat(64),
            capture_width: 1280,
            capture_height: 720,
            immediate_purge_confirmed: true,
        },
    });
    expect(completeResponse.ok()).toBeTruthy();

    await page.goto(`/apply/liveness/callback?session_id=${encodeURIComponent(sessionId)}`);

    await expect.poll(async () => {
        const status = await fetchStatus(page);
        return status.step === ADMISSION_STAGES.CONSENTS || status.step === ADMISSION_STAGES.DOCUMENTS;
    }, {
        timeout: 30000,
        intervals: [1000, 2000, 5000],
    }).toBe(true);
}

async function completeConsents(page: Page) {
    await page.goto('/apply/contracts');

    for (let i = 0; i < 10; i += 1) {
        if (/\/apply\/status(\?.*)?$/.test(page.url())) {
            break;
        }

        if (/\/apply\/contracts(\?.*)?$/.test(page.url())) {
            await page.waitForURL(/.*\/apply\/(status|documents|contracts\/[^/?#]+)(\?.*)?$/, { timeout: 15000 });
        }

        if (/\/apply\/(status|documents)(\?.*)?$/.test(page.url())) {
            break;
        }

        await expect(page).toHaveURL(/.*\/apply\/contracts\/[^/?#]+(\?.*)?$/);

        await page.locator('form').waitFor({ state: 'visible' });

        const typedPhraseInput = page.locator('form input[name="typedPhrase"]').first();
        if (await typedPhraseInput.count()) {
            await typedPhraseInput.waitFor({ state: 'visible' });
            const title = (await typedPhraseInput.getAttribute('title')) ?? '';
            const phraseText = title.replace(/^Must exactly match:\s*/, '').trim();
            await typedPhraseInput.scrollIntoViewIfNeeded();
            await typedPhraseInput.fill(phraseText);
            await expect(typedPhraseInput).toHaveValue(phraseText);
        }

        const secondaryConfirm = page.locator('form input[name="secondaryConfirm"]').first();
        if (await secondaryConfirm.count()) {
            await secondaryConfirm.waitFor({ state: 'visible' });
            await secondaryConfirm.check();
            await expect(secondaryConfirm).toBeChecked();
        }

        const validityDebug = await page.locator('form').evaluate((form) => {
            const typed = form.querySelector('input[name="typedPhrase"]');
            const secondary = form.querySelector('input[name="secondaryConfirm"]');
            return {
                formIsValid: form.checkValidity(),
                typedValue: typed ? typed.value : null,
                typedPattern: typed ? typed.getAttribute('pattern') : null,
                typedTitle: typed ? typed.getAttribute('title') : null,
                typedRequired: typed ? typed.required : null,
                typedValidity: typed ? {
                    valueMissing: typed.validity.valueMissing,
                    patternMismatch: typed.validity.patternMismatch,
                    valid: typed.validity.valid,
                    validationMessage: typed.validationMessage,
                } : null,
                secondaryChecked: secondary ? secondary.checked : null,
                secondaryRequired: secondary ? secondary.required : null,
                secondaryValidity: secondary ? {
                    valueMissing: secondary.validity.valueMissing,
                    valid: secondary.validity.valid,
                    validationMessage: secondary.validationMessage,
                } : null,
            };
        });
        expect(validityDebug.formIsValid).toBe(true);

        const beforeUrl = page.url();
        await page.locator('form button[type="submit"]').click();
        await page.waitForFunction(
            (prev) => window.location.href !== prev,
            beforeUrl,
            { timeout: 15000 }
        );
    }

    await expect.poll(async () => {
        const status = await fetchStatus(page);
        return status.step;
    }, {
        timeout: 60000,
        intervals: [1000, 2000, 5000],
    }).toBe(ADMISSION_STAGES.DOCUMENTS);
}

async function uploadAndScanDocument(page: Page, index: number, name: string, content: string) {
    const fileBuffer = Buffer.from(content);
    const fileInput = page.locator('input[type="file"]').nth(index);
    await fileInput.setInputFiles({
        name,
        mimeType: 'application/pdf',
        buffer: fileBuffer,
    });
    const button = fileInput.locator('xpath=ancestor::section[1]').locator('button[type="button"]').last();
    await expect(button).toBeEnabled({ timeout: 60000 });

    const uploadResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().includes('/api/admission/document/upload')
    ), { timeout: 60000 });

    const submitResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().includes('/api/admission/document/submit')
    ), { timeout: 60000 });

    await button.click();

    const uploadResult = await uploadResponsePromise;
    expect(uploadResult.ok()).toBeTruthy();

    const submitResult = await submitResponsePromise;
    expect(submitResult.ok()).toBeTruthy();
}

async function completeDocumentsForAiDecision(page: Page) {
    await page.goto('/apply/documents');

    await uploadAndScanDocument(page, 0, 'graduation.pdf', 'graduation-certificate-sample');
    await uploadAndScanDocument(page, 1, 'income.pdf', 'income-certificate-100000000-2025');
    await uploadAndScanDocument(page, 2, 'marriage.pdf', 'marriage-certificate-married');
    await uploadAndScanDocument(page, 3, 'family.pdf', 'family-certificate-has-children');

    await waitForAuthoritativeActiveStatus(page);
}

async function startAdmissionIfNeeded(page: Page) {
    await page.goto('/apply');
    const startButton = page.getByRole('button', { name: exactNames('Start admission', 'Admission 시작') });
    const canStartFromLanding = await startButton.isVisible().catch(() => false);
    if (canStartFromLanding) {
        await startButton.click();
    }
}

async function decideColdPathByAdmin(
    request: APIRequestContext,
    page: Page,
    decision: 'APPROVE' | 'REJECT' | 'RESUBMIT' = 'APPROVE',
) {
    const status = await fetchStatus(page);
    const reviewCaseId = typeof status?.meta?.review_case_id === 'string' ? status.meta.review_case_id : null;
    expect(reviewCaseId).toBeTruthy();

    const cronSecret = process.env.CRON_SECRET || '';
    expect(cronSecret.length).toBeGreaterThan(0);

    const decideRes = await request.post('/api/admin/admissions/decide', {
        headers: { 'x-cron-secret': cronSecret },
        data: {
            review_case_id: reviewCaseId,
            decision,
            reviewer_notes: `playwright cold path ${decision}`,
        },
    });

    expect(decideRes.status()).toBe(200);
}

test.describe('Admission E2E Flow (cjmn only) @auth-stateful', () => {
    test.describe.configure({ mode: 'serial' });

    test('happy path: login -> identity -> liveness -> consents -> docs -> AI auto approve -> soul issued -> active', async ({ page }) => {
        const { user_id: userId } = readE2ECreds();
        await resetAdmissionState(userId);

        await startAdmissionIfNeeded(page);

        await completeIdentity(page);
        await completeLiveness(page);
        await completeConsents(page);
        await completeDocumentsForAiDecision(page);

        await expectDashboardActiveSurface(page);
    });

    test('resubmission path: docs flagged -> resubmit -> AI auto approve', async ({ page }) => {
        const { user_id: userId } = readE2ECreds();
        await resetAdmissionState(userId);

        await startAdmissionIfNeeded(page);

        await completeIdentity(page);
        await completeLiveness(page);
        await completeConsents(page);

        await page.goto('/apply/documents');

        // First try with sensitive PII to force resubmission
        await uploadAndScanDocument(page, 0, 'graduation-invalid.pdf', 'mock text 900101-1234567');

        await expect.poll(async () => {
            const status = await fetchStatus(page);
            return {
                step: status.step,
                hasResubmit: Array.isArray(status.blockers) && status.blockers.includes(STATUS_BLOCKER_CODES.RESUBMISSION_REQUIRED),
            };
        }, {
            timeout: 60000,
            intervals: [1000, 2000, 5000],
        }).toEqual({ step: ADMISSION_STAGES.RESUBMIT_REQUIRED, hasResubmit: true });

        // Resubmit clean docs and continue
        await uploadAndScanDocument(page, 0, 'graduation-clean.pdf', 'graduation-certificate-clean');
        await uploadAndScanDocument(page, 1, 'income.pdf', 'income-certificate-100000000-2025');
        await uploadAndScanDocument(page, 2, 'marriage.pdf', 'marriage-certificate-married');
        await uploadAndScanDocument(page, 3, 'family.pdf', 'family-certificate-has-children');

        await waitForAuthoritativeActiveStatus(page);

        await expectDashboardActiveSurface(page);
    });

    test('exception path: anomaly doc -> exception queue -> admin approve', async ({ page, request }) => {
        const { user_id: userId } = readE2ECreds();
        await resetAdmissionState(userId);

        await startAdmissionIfNeeded(page);

        await completeIdentity(page);
        await completeLiveness(page);
        await completeConsents(page);

        await page.goto('/apply/documents');
        await uploadAndScanDocument(page, 0, 'graduation-anomaly.pdf', 'graduation ANOMALY suspicious blurry');
        await uploadAndScanDocument(page, 1, 'income.pdf', 'income-certificate-100000000-2025');
        await uploadAndScanDocument(page, 2, 'marriage.pdf', 'marriage-certificate-married');
        await uploadAndScanDocument(page, 3, 'family.pdf', 'family-certificate-has-children');

        await expect.poll(async () => {
            const status = await fetchStatus(page);
            return status.step;
        }, {
            timeout: 90000,
            intervals: [1000, 2000, 5000],
        }).toBe(ADMISSION_STAGES.EXCEPTION_REVIEW);

        await decideColdPathByAdmin(request, page, 'APPROVE');

        await waitForAuthoritativeActiveStatus(page);
    });

    test('appeal path: reject -> appeal -> admin approve', async ({ page, request }) => {
        const { user_id: userId } = readE2ECreds();
        await resetAdmissionState(userId);

        await startAdmissionIfNeeded(page);

        await completeIdentity(page);
        await completeLiveness(page);
        await completeConsents(page);

        await page.goto('/apply/documents');
        await uploadAndScanDocument(page, 0, 'graduation-forged.pdf', 'FORGED fake_doc tampered marker');
        await uploadAndScanDocument(page, 1, 'income.pdf', 'income-certificate-100000000-2025');
        await uploadAndScanDocument(page, 2, 'marriage.pdf', 'marriage-certificate-married');
        await uploadAndScanDocument(page, 3, 'family.pdf', 'family-certificate-has-children');

        await expect.poll(async () => {
            const status = await fetchStatus(page);
            return status.step;
        }, {
            timeout: 90000,
            intervals: [1000, 2000, 5000],
        }).toBe(ADMISSION_STAGES.REJECTED);

        await page.goto('/apply/appeal');
        await page.locator('form select').selectOption('DECISION_DISPUTE');
        await page.locator('form textarea').fill('문서 진본이며 판독 결과가 잘못되었다고 판단합니다. 재검토를 요청합니다.');
        await page.locator('form button[type="submit"]').click();

        await expect.poll(async () => {
            const status = await fetchStatus(page);
            return status.step;
        }, {
            timeout: 90000,
            intervals: [1000, 2000, 5000],
        }).toBe(ADMISSION_STAGES.APPEAL_PENDING);

        await decideColdPathByAdmin(request, page, 'APPROVE');

        await waitForAuthoritativeActiveStatus(page);
    });
});
