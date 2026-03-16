import test from 'node:test';
import assert from 'node:assert/strict';

const {
    isValidConsentAckPhrase,
    normalizeAckPhrase,
    scanAdmissionDocument,
    buildAttestationHash,
} = await import('../../lib/server/admission.ts');

test('consent ack phrase validation enforces exact typed phrase', () => {
    assert.equal(
        isValidConsentAckPhrase('IDENTITY_HANDLING', 'I ACKNOWLEDGE IDENTITY HANDLING'),
        true,
    );

    assert.equal(
        isValidConsentAckPhrase('IDENTITY_HANDLING', 'I acknowledge identity handling'),
        true,
    );

    assert.equal(
        isValidConsentAckPhrase('IDENTITY_HANDLING', 'I AGREE IDENTITY HANDLING'),
        false,
    );
});

test('normalizeAckPhrase trims, collapses spaces, and uppercases consistently', () => {
    assert.equal(
        normalizeAckPhrase('  i   acknowledge   identity   handling  '),
        'I ACKNOWLEDGE IDENTITY HANDLING',
    );
    assert.equal(normalizeAckPhrase(null), '');
});

test('document scan rejects high-risk pii patterns', () => {
    const buffer = Buffer.from('resident number 900101-1234567');
    const result = scanAdmissionDocument(buffer, 'GRADUATION_CERTIFICATE');

    assert.equal(result.processingStatus, 'RESUBMIT_REQUIRED');
    assert.equal(result.finalResult, 'RESUBMIT_REQUIRED');
    assert.match(result.aiResult, /AUTO_REJECT/);
});

test('document scan maps income certificate to minimal claim schema', () => {
    const buffer = Buffer.from('income-certificate 2025 100,000,000');
    const result = scanAdmissionDocument(buffer, 'INCOME_CERTIFICATE');

    assert.equal(result.processingStatus, 'AI_PASSED');
    assert.equal(result.finalResult, 'PENDING');
    assert.equal(result.extractedClaims.income_verified, true);
    assert.equal(typeof result.extractedClaims.income_band, 'string');
});

test('document scan emits anomaly signal for low-confidence suspicious text', () => {
    const buffer = Buffer.from('ANOMALY suspicious blurry document');
    const result = scanAdmissionDocument(buffer, 'MARRIAGE_CERTIFICATE');

    assert.equal(result.processingStatus, 'AI_PASSED');
    assert.equal(result.finalResult, 'PENDING');
    assert.match(result.aiResult, /ANOMALY:LOW_CONFIDENCE/);
    assert.equal(result.aiConfidence, 0.34);
});

test('document scan emits hard reject signal for forged markers', () => {
    const buffer = Buffer.from('FORGED fake_doc tampered');
    const result = scanAdmissionDocument(buffer, 'GRADUATION_CERTIFICATE');

    assert.equal(result.processingStatus, 'AI_REJECTED');
    assert.equal(result.finalResult, 'PENDING');
    assert.match(result.aiResult, /AUTO_REJECT:FORGED/);
    assert.equal(result.aiConfidence, 0.05);
});

test('attestation hash is deterministic', () => {
    const payload = { graduate_verified: true, school_name_masked: '***학교' };
    const hash1 = buildAttestationHash('user-1', 'GRADUATION_VERIFIED', payload);
    const hash2 = buildAttestationHash('user-1', 'GRADUATION_VERIFIED', payload);

    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
});
