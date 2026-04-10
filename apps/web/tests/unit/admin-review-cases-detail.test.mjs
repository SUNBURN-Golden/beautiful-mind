import assert from 'node:assert/strict';
import test from 'node:test';

const { getAdminAdmissionReviewCaseDetail } = await import('../../lib/server/admin-review-cases-detail.ts');

function makeAdminStub(tableRows) {
    function makeBuilder(table) {
        let rows = [...(tableRows[table] || [])];

        const builder = {
            select() {
                return builder;
            },
            eq(column, value) {
                rows = rows.filter((row) => row[column] === value);
                return builder;
            },
            in(column, values) {
                const allowed = new Set(values);
                rows = rows.filter((row) => allowed.has(row[column]));
                return builder;
            },
            order(column, { ascending = true } = {}) {
                rows.sort((left, right) => {
                    const a = left[column];
                    const b = right[column];
                    if (a === b) return 0;
                    if (a == null) return ascending ? -1 : 1;
                    if (b == null) return ascending ? 1 : -1;
                    return ascending ? (a < b ? -1 : 1) : (a < b ? 1 : -1);
                });
                return builder;
            },
            limit(count) {
                rows = rows.slice(0, count);
                return builder;
            },
            returns() {
                return builder;
            },
            maybeSingle() {
                return Promise.resolve({
                    data: rows[0] || null,
                    error: null,
                });
            },
            then(resolve, reject) {
                return Promise.resolve({
                    data: rows,
                    error: null,
                }).then(resolve, reject);
            },
        };

        return builder;
    }

    return {
        from(table) {
            return makeBuilder(table);
        },
    };
}

test('admin review detail surfaces contracts-based signatures even when legacy consent events are empty', async () => {
    const admin = makeAdminStub({
        review_cases: [
            {
                id: 'review-1',
                admission_application_id: 'app-1',
                user_id: 'user-1',
                state: 'OPEN',
                opened_at: '2026-04-10T00:00:00.000Z',
                decided_at: null,
                decided_by: null,
                reviewer_notes: null,
                ai_summary_json: {},
                created_at: '2026-04-10T00:00:00.000Z',
                updated_at: '2026-04-10T00:00:00.000Z',
            },
        ],
        admission_applications: [
            { id: 'app-1', user_id: 'user-1', status: 'IN_REVIEW', current_step: 'REVIEW' },
        ],
        admission_document_submissions: [],
        consent_events: [],
        contract_bundle_requirements: [
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'intelligence-monitoring', order_index: 70, required: true },
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'fraud-penalty', order_index: 80, required: true },
        ],
        contract_documents: [
            { slug: 'intelligence-monitoring', display_title: 'Behavioral Intelligence & Matching Monitoring Covenant', active_version_id: 'intel-v5' },
            { slug: 'fraud-penalty', display_title: 'Fraudulent Document Liability Covenant', active_version_id: 'fraud-v4' },
        ],
        contract_acceptances: [
            {
                id: 'accept-intel',
                user_id: 'user-1',
                document_slug: 'intelligence-monitoring',
                version_id: 'intel-v5',
                accepted_at: '2026-04-10T00:01:00.000Z',
                accepted_via: 'APPLY_CONTRACT_STACK',
                secondary_confirmed_at: null,
                admission_application_id: 'app-1',
            },
            {
                id: 'accept-fraud',
                user_id: 'user-1',
                document_slug: 'fraud-penalty',
                version_id: 'fraud-v4',
                accepted_at: '2026-04-10T00:02:00.000Z',
                accepted_via: 'APPLY_CONTRACT_STACK',
                secondary_confirmed_at: '2026-04-10T00:02:10.000Z',
                admission_application_id: 'app-1',
            },
        ],
        typed_acknowledgement_evidence: [
            {
                acceptance_id: 'accept-intel',
                typed_phrase: 'I understand SoulBound may analyze chat and update internal trust systems.',
                ack_category: 'INTELLIGENCE_MONITORING',
                timestamp: '2026-04-10T00:01:05.000Z',
            },
            {
                acceptance_id: 'accept-fraud',
                typed_phrase: 'I acknowledge the fraud penalty.',
                ack_category: 'FRAUD_PENALTY_COVENANT',
                timestamp: '2026-04-10T00:02:05.000Z',
            },
        ],
        contract_acceptance_events: [
            {
                acceptance_id: 'accept-intel',
                user_id: 'user-1',
                event_type: 'ACCEPTED',
                event_payload: { document_slug: 'intelligence-monitoring', version_id: 'intel-v5' },
                created_at: '2026-04-10T00:01:06.000Z',
            },
            {
                acceptance_id: 'accept-fraud',
                user_id: 'user-1',
                event_type: 'ACCEPTED',
                event_payload: { document_slug: 'fraud-penalty', version_id: 'fraud-v4', secondary_confirmed: true },
                created_at: '2026-04-10T00:02:06.000Z',
            },
        ],
        review_case_events: [],
        trust_ledger_events: [],
        verified_claims: [],
        soul_credentials: [],
        admission_decision_runs: [],
    });

    const detail = await getAdminAdmissionReviewCaseDetail(admin, 'review-1');

    assert.deepEqual(detail.consents, []);
    assert.equal(detail.contract_signatures.length, 2);
    assert.deepEqual(
        detail.contract_signatures.map((row) => [row.document_slug, row.signed_current_version]),
        [
            ['intelligence-monitoring', true],
            ['fraud-penalty', true],
        ],
    );

    const fraud = detail.contract_signatures.find((row) => row.document_slug === 'fraud-penalty');
    assert.equal(fraud?.typed_ack_phrase, 'I acknowledge the fraud penalty.');
    assert.equal(fraud?.ack_category, 'FRAUD_PENALTY_COVENANT');
    assert.equal(fraud?.secondary_confirmed_at, '2026-04-10T00:02:10.000Z');
    assert.equal(fraud?.latest_event_type, 'ACCEPTED');

    const intelligence = detail.contract_signatures.find((row) => row.document_slug === 'intelligence-monitoring');
    assert.equal(intelligence?.typed_ack_phrase, 'I understand SoulBound may analyze chat and update internal trust systems.');
    assert.equal(intelligence?.ack_category, 'INTELLIGENCE_MONITORING');
});

test('admin review detail preserves legacy consent events for backward compatibility', async () => {
    const admin = makeAdminStub({
        review_cases: [
            {
                id: 'review-legacy',
                admission_application_id: 'app-legacy',
                user_id: 'user-legacy',
                state: 'OPEN',
                opened_at: '2026-04-10T00:00:00.000Z',
                decided_at: null,
                decided_by: null,
                reviewer_notes: null,
                ai_summary_json: {},
                created_at: '2026-04-10T00:00:00.000Z',
                updated_at: '2026-04-10T00:00:00.000Z',
            },
        ],
        admission_applications: [
            { id: 'app-legacy', user_id: 'user-legacy', status: 'IN_REVIEW', current_step: 'REVIEW' },
        ],
        admission_document_submissions: [],
        consent_events: [
            {
                user_id: 'user-legacy',
                consent_type: 'IDENTITY_HANDLING',
                policy_version: 'admission-v1',
                granted_at: '2026-04-10T00:03:00.000Z',
                typed_ack_phrase: 'I ACKNOWLEDGE IDENTITY HANDLING',
                capture_method: 'web_form',
                audit_reference: 'consent:user-legacy:IDENTITY_HANDLING',
            },
        ],
        contract_bundle_requirements: [],
        contract_documents: [],
        contract_acceptances: [],
        typed_acknowledgement_evidence: [],
        contract_acceptance_events: [],
        review_case_events: [],
        trust_ledger_events: [],
        verified_claims: [],
        soul_credentials: [],
        admission_decision_runs: [],
    });

    const detail = await getAdminAdmissionReviewCaseDetail(admin, 'review-legacy');

    assert.equal(detail.contract_signatures.length, 0);
    assert.equal(detail.consents.length, 1);
    assert.equal(detail.consents[0].consent_type, 'IDENTITY_HANDLING');
    assert.equal(detail.consents[0].typed_ack_phrase, 'I ACKNOWLEDGE IDENTITY HANDLING');
});
