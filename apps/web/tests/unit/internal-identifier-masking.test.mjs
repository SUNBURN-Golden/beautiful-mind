import assert from 'node:assert/strict';
import test from 'node:test';

const {
    formatBuildReference,
    formatCommitReference,
    formatConfidenceForDisplay,
    formatContractReference,
    formatHashReference,
    formatPacketReference,
    formatReceiptReference,
    formatSupportReference,
    formatTimestampForDisplay,
    maskInternalIdentifier,
} = await import('../../lib/presentation/internal-identifier-masking.ts');

test('ordinary masking hides raw hashes and build metadata', () => {
    const rawHash = '0x8b29c4d917f4a8e1d55a62b3c7145f09';

    assert.equal(formatHashReference(rawHash, 'en'), 'Evidence hash on file');
    assert.equal(formatHashReference(rawHash, 'ko'), '증거 해시 보관됨');
    assert.equal(formatCommitReference('533be8a', 'en'), 'Build reference available to support');
    assert.equal(formatBuildReference('soulbound-launch-ui-v3', 'ko'), '지원용 빌드 참조 보관됨');
    assert.equal(formatPacketReference('INV-5.5-LANDING', 'en'), 'Packet reference available to support');
    assert.equal(formatReceiptReference('standing-active', 'ko'), '기록 참조가 보관됨');
    assert.equal(formatSupportReference('REFERENCE_CODE', 'en'), 'Support reference on file');
});

test('support and diagnostic masking preserve traceability', () => {
    const rawHash = '0x8b29c4d917f4a8e1d55a62b3c7145f09';

    assert.equal(formatHashReference(rawHash, 'en', 'support', 'full'), rawHash);
    assert.equal(formatHashReference(rawHash, 'en', 'diagnostic'), '0x8b29...14 5f09'.replace(' ', ''));
    assert.equal(formatCommitReference('533be8a', 'en', 'support'), '533be8a');
    assert.equal(formatBuildReference('soulbound-launch-ui-v3', 'ko', 'diagnostic', 'full'), 'soulbound-launch-ui-v3');
    assert.equal(formatPacketReference('INV-5.5-LANDING', 'en', 'support', 'full'), 'INV-5.5-LANDING');
    assert.equal(formatReceiptReference('standing-active', 'ko', 'support'), 'standing-active');
});

test('contract references use known labels for ordinary UI and raw values for support', () => {
    assert.equal(
        formatContractReference('dashboard.access-board.v1', 'en'),
        'Access board record',
    );
    assert.equal(
        formatContractReference('unknown.contract.v1', 'ko'),
        '계약 참조가 보관됨',
    );
    assert.equal(
        formatContractReference('unknown.contract.v1', 'en', 'support', 'full'),
        'unknown.contract.v1',
    );
});

test('confidence display masks raw decimals for ordinary UI', () => {
    assert.equal(formatConfidenceForDisplay(0.96, 'en'), 'High confidence');
    assert.equal(formatConfidenceForDisplay(0.82, 'ko'), '중간 신뢰도');
    assert.equal(formatConfidenceForDisplay(0.41, 'en'), 'Needs human review');
    assert.equal(formatConfidenceForDisplay(0.96, 'en', 'support'), '0.96');
    assert.equal(formatConfidenceForDisplay(null, 'ko'), '신뢰도 기록 없음');
});

test('timestamp display is localized for ordinary UI and raw for diagnostics', () => {
    const iso = '2026-04-27T12:30:00.000Z';

    assert.notEqual(formatTimestampForDisplay(iso, 'en'), iso);
    assert.notEqual(formatTimestampForDisplay(iso, 'ko'), iso);
    assert.equal(formatTimestampForDisplay(iso, 'en', 'diagnostic'), iso);
    assert.equal(formatTimestampForDisplay('not-a-date', 'ko'), '기록 시각이 보관됨');
});

test('maskInternalIdentifier dispatches safely by identifier kind', () => {
    assert.equal(
        maskInternalIdentifier('identity.active', { kind: 'contract', locale: 'en' }),
        'Identity verification record',
    );
    assert.equal(
        maskInternalIdentifier('standing-active', { kind: 'receipt', locale: 'ko' }),
        '기록 참조가 보관됨',
    );
    assert.equal(
        maskInternalIdentifier('533be8a', { kind: 'commit', locale: 'en', audience: 'support' }),
        '533be8a',
    );
    assert.equal(
        maskInternalIdentifier('raw-support-code', { kind: 'support', locale: 'ko' }),
        '지원 참조가 보관됨',
    );
});
