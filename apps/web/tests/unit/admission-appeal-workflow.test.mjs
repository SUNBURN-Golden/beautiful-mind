import test from 'node:test';
import assert from 'node:assert/strict';

const {
    buildAppealReasonText,
    buildAppealInsertPayload,
    buildAppealReviewCaseUpsertPayload,
    buildAppealReviewCaseEventPayload,
    buildApplicationAppealPatch,
    buildAppealLedgerPayload,
    runOpenAppealWorkflow,
} = await import('../../lib/server/admission-appeal.ts');

function makeContext(overrides = {}) {
    return {
        applicationId: 'app-1',
        userId: 'user-1',
        reasonCode: 'DOC_MISMATCH',
        statement: 'The extracted field does not match the uploaded document.',
        evidenceRef: 'evidence://appeal-1',
        decisionRunId: 'run-1',
        nowIso: '2026-03-10T12:00:00.000Z',
        ...overrides,
    };
}

test('appeal payload builders shape deterministic DB payloads', () => {
    const context = makeContext();

    assert.equal(
        buildAppealReasonText(context.reasonCode, context.statement),
        'DOC_MISMATCH: The extracted field does not match the uploaded document.',
    );

    assert.deepEqual(buildAppealInsertPayload(context), {
        user_id: 'user-1',
        admission_application_id: 'app-1',
        source_decision_run_id: 'run-1',
        status: 'OPEN',
        appeal_reason_text: 'DOC_MISMATCH: The extracted field does not match the uploaded document.',
        evidence_ref: 'evidence://appeal-1',
        created_at: '2026-03-10T12:00:00.000Z',
    });

    assert.deepEqual(buildAppealReviewCaseUpsertPayload(context, 'appeal-1'), {
        admission_application_id: 'app-1',
        user_id: 'user-1',
        state: 'UNDER_REVIEW',
        opened_at: '2026-03-10T12:00:00.000Z',
        reviewer_notes: null,
        decided_at: null,
        decided_by: null,
        ai_summary_json: {
            queue_type: 'APPEAL',
            appeal_id: 'appeal-1',
            reason_code: 'DOC_MISMATCH',
            statement: 'The extracted field does not match the uploaded document.',
            evidence_ref: 'evidence://appeal-1',
            source_decision_run_id: 'run-1',
        },
    });

    assert.deepEqual(buildAppealReviewCaseEventPayload(context, 'appeal-1', 'review-1'), {
        review_case_id: 'review-1',
        actor_user_id: 'user-1',
        actor_role: 'APPLICANT',
        event_type: 'APPEAL_OPENED',
        payload: {
            appeal_id: 'appeal-1',
            reason_code: 'DOC_MISMATCH',
            statement: 'The extracted field does not match the uploaded document.',
            evidence_ref: 'evidence://appeal-1',
            source_decision_run_id: 'run-1',
            requested_at: '2026-03-10T12:00:00.000Z',
        },
    });

    assert.deepEqual(buildApplicationAppealPatch(context.nowIso), {
        status: 'APPEAL_PENDING',
        current_step: 'APPEAL_PENDING',
        human_review_started_at: '2026-03-10T12:00:00.000Z',
    });

    assert.deepEqual(buildAppealLedgerPayload(context, 'appeal-1', 'review-1'), {
        appeal_id: 'appeal-1',
        review_case_id: 'review-1',
        source_decision_run_id: 'run-1',
        reason_code: 'DOC_MISMATCH',
        evidence_ref: 'evidence://appeal-1',
        requested_at: '2026-03-10T12:00:00.000Z',
    });
});

test('runOpenAppealWorkflow executes side effects in strict business order', async () => {
    const calls = [];
    const context = makeContext();

    const result = await runOpenAppealWorkflow(context, {
        createAppeal: async (payload) => {
            calls.push(['createAppeal', payload]);
            return { id: 'appeal-1' };
        },
        upsertReviewCase: async (payload) => {
            calls.push(['upsertReviewCase', payload]);
            return { id: 'review-1' };
        },
        appendReviewCaseEvent: async (payload) => {
            calls.push(['appendReviewCaseEvent', payload]);
        },
        updateApplicationState: async (applicationId, patch) => {
            calls.push(['updateApplicationState', applicationId, patch]);
        },
        appendLedgerEvent: async (payload) => {
            calls.push(['appendLedgerEvent', payload]);
        },
    });

    assert.deepEqual(
        calls.map((entry) => entry[0]),
        ['createAppeal', 'upsertReviewCase', 'appendReviewCaseEvent', 'updateApplicationState', 'appendLedgerEvent'],
    );
    assert.deepEqual(result, {
        appealId: 'appeal-1',
        reviewCaseId: 'review-1',
    });
});

test('runOpenAppealWorkflow stops sequence when repeated open appeal insert fails', async () => {
    const calls = [];
    const context = makeContext();

    await assert.rejects(
        () => runOpenAppealWorkflow(context, {
            createAppeal: async () => {
                calls.push('createAppeal');
                throw new Error('duplicate key value violates unique constraint appeals_single_open_per_application');
            },
            upsertReviewCase: async () => {
                calls.push('upsertReviewCase');
                return { id: 'review-1' };
            },
            appendReviewCaseEvent: async () => {
                calls.push('appendReviewCaseEvent');
            },
            updateApplicationState: async () => {
                calls.push('updateApplicationState');
            },
            appendLedgerEvent: async () => {
                calls.push('appendLedgerEvent');
            },
        }),
        /appeals_single_open_per_application/,
    );

    assert.deepEqual(calls, ['createAppeal']);
});
