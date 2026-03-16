import test from 'node:test';
import assert from 'node:assert/strict';

const {
    buildClaimCandidates,
    buildVerifiedClaimInserts,
    mapClaimType,
    normalizeClaimValue,
} = await import('../../lib/server/admission-decision-engine/claims.ts');
const { ADMISSION_POLICY_VERSION } = await import('../../lib/server/admission.ts');

function makeDocs() {
    return [
        {
            id: 'doc-grad',
            document_type: 'GRADUATION_CERTIFICATE',
            upload_status: 'UPLOADED',
            processing_status: 'AI_PASSED',
            final_result: 'VERIFIED',
            ai_result: 'AI_PASS',
            ai_confidence: 0.9,
            file_storage_key_ephemeral: null,
            extracted_claims_json: {
                graduate_verified: true,
                school_name_masked: 'S***U',
            },
        },
        {
            id: 'doc-income',
            document_type: 'INCOME_CERTIFICATE',
            upload_status: 'UPLOADED',
            processing_status: 'AI_PASSED',
            final_result: 'VERIFIED',
            ai_result: 'AI_PASS',
            ai_confidence: 0.9,
            file_storage_key_ephemeral: null,
            extracted_claims_json: {
                income_year: 2025,
                income_band: 'BAND_4',
                income_verified: true,
            },
        },
    ];
}

test('mapClaimType maps admission document types to claim types', () => {
    assert.equal(mapClaimType('GRADUATION_CERTIFICATE'), 'GRADUATION_VERIFIED');
    assert.equal(mapClaimType('INCOME_CERTIFICATE'), 'INCOME_BAND_VERIFIED');
    assert.equal(mapClaimType('MARRIAGE_CERTIFICATE'), 'MARITAL_STATUS_VERIFIED');
    assert.equal(mapClaimType('FAMILY_RELATION_CERTIFICATE'), 'HAS_CHILDREN_VERIFIED');
});

test('normalizeClaimValue keeps minimal normalized claim payload shape', () => {
    const graduation = normalizeClaimValue('GRADUATION_CERTIFICATE', {
        graduate_verified: true,
        school_name_masked: 'S***U',
        full_school_name: 'DO_NOT_STORE',
    });
    const income = normalizeClaimValue('INCOME_CERTIFICATE', {
        income_year: 2025,
        income_band: 'BAND_4',
        income_verified: true,
    });

    assert.deepEqual(graduation, {
        graduate_verified: true,
        school_name_masked: 'S***U',
    });
    assert.deepEqual(income, {
        income_year: 2025,
        income_band: 'BAND_4',
        income_verified: true,
    });
});

test('buildClaimCandidates builds candidates from admission docs only', () => {
    const candidates = buildClaimCandidates([
        ...makeDocs(),
        {
            id: 'doc-legacy',
            document_type: 'RESIDENCE',
            upload_status: 'UPLOADED',
            processing_status: 'AI_PASSED',
            final_result: 'VERIFIED',
            ai_result: 'AI_PASS',
            ai_confidence: 0.9,
            file_storage_key_ephemeral: null,
            extracted_claims_json: { value: true },
        },
    ]);

    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].claim_type, 'GRADUATION_VERIFIED');
    assert.equal(candidates[1].claim_type, 'INCOME_BAND_VERIFIED');
});

test('buildVerifiedClaimInserts skips already existing claim types (idempotent insert expectation)', () => {
    const inserts = buildVerifiedClaimInserts({
        userId: 'user-1',
        candidates: buildClaimCandidates(makeDocs()),
        existingClaimTypes: ['GRADUATION_VERIFIED'],
        verificationMethod: 'AI_RULE_ENGINE',
        nowIso: '2026-03-10T00:00:00.000Z',
        policyVersion: ADMISSION_POLICY_VERSION,
    });

    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].claim_type, 'INCOME_BAND_VERIFIED');
    assert.equal(inserts[0].user_id, 'user-1');
    assert.equal(inserts[0].verification_method, 'AI_RULE_ENGINE');
    assert.equal(inserts[0].policy_version, ADMISSION_POLICY_VERSION);
});
