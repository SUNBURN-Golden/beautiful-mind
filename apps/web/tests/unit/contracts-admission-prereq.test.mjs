import assert from 'node:assert/strict';
import test from 'node:test';

const { getMissingRequiredAdmissionContracts } = await import('../../lib/server/admission/required-contracts.ts');

function makeContractsAdminStub({
    bundleRequirements,
    contractDocuments,
    contractAcceptances,
}) {
    const tables = {
        contract_bundle_requirements: bundleRequirements,
        contract_documents: contractDocuments,
        contract_acceptances: contractAcceptances,
    };

    function makeSelectChain(table) {
        let rows = [...(tables[table] || [])];

        return {
            eq(column, value) {
                rows = rows.filter((row) => row[column] === value);
                return this;
            },
            order(column, { ascending = true } = {}) {
                rows.sort((left, right) => {
                    const a = left[column];
                    const b = right[column];
                    if (a === b) return 0;
                    if (a == null) return ascending ? -1 : 1;
                    if (b == null) return ascending ? 1 : -1;
                    return ascending
                        ? (a < b ? -1 : 1)
                        : (a < b ? 1 : -1);
                });
                return Promise.resolve({ data: rows, error: null });
            },
            returns() {
                return Promise.resolve({ data: rows, error: null });
            },
        };
    }

    return {
        from(table) {
            return {
                select() {
                    return makeSelectChain(table);
                },
            };
        },
    };
}

test('getMissingRequiredAdmissionContracts treats admission-core contract acceptances as the authoritative prerequisite', async () => {
    const admin = makeContractsAdminStub({
        bundleRequirements: [
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'identity-handling', order_index: 10, required: true },
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'intelligence-monitoring', order_index: 20, required: true },
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'fraud-penalty', order_index: 30, required: true },
        ],
        contractDocuments: [
            { slug: 'identity-handling', active_version_id: 'identity-v2', required_for_admission: true },
            { slug: 'intelligence-monitoring', active_version_id: 'intel-v5', required_for_admission: true },
            { slug: 'fraud-penalty', active_version_id: 'fraud-v4', required_for_admission: true },
        ],
        contractAcceptances: [
            { user_id: 'user-1', document_slug: 'identity-handling', version_id: 'identity-v2' },
            { user_id: 'user-1', document_slug: 'intelligence-monitoring', version_id: 'intel-v4' },
            { user_id: 'user-2', document_slug: 'fraud-penalty', version_id: 'fraud-v4' },
        ],
    });

    const missing = await getMissingRequiredAdmissionContracts('user-1', admin);
    assert.deepEqual(missing, ['intelligence-monitoring', 'fraud-penalty']);
});

test('getMissingRequiredAdmissionContracts ignores non-bundle documents once all admission-core contracts are signed', async () => {
    const admin = makeContractsAdminStub({
        bundleRequirements: [
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'identity-handling', order_index: 10, required: true },
            { bundle_key: 'admission-core', stage_code: 'CONSENTS', document_slug: 'fraud-penalty', order_index: 20, required: true },
        ],
        contractDocuments: [
            { slug: 'identity-handling', active_version_id: 'identity-v2', required_for_admission: true },
            { slug: 'fraud-penalty', active_version_id: 'fraud-v4', required_for_admission: true },
            { slug: 'optional-experiment', active_version_id: 'opt-v1', required_for_admission: true },
        ],
        contractAcceptances: [
            { user_id: 'user-1', document_slug: 'identity-handling', version_id: 'identity-v2' },
            { user_id: 'user-1', document_slug: 'fraud-penalty', version_id: 'fraud-v4' },
            { user_id: 'user-1', document_slug: 'optional-experiment', version_id: 'opt-v0' },
        ],
    });

    const missing = await getMissingRequiredAdmissionContracts('user-1', admin);
    assert.deepEqual(missing, []);
});
