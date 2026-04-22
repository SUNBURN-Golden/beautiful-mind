'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { ReceiptCard } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getReceiptCardCopy } from '@/i18n/domain/receipt-card';

export default function ManualVocabularyReceiptCardPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getReceiptCardCopy(locale);
                const manualCopy = getManualFixturesCopy(locale);

                return (
                    <section className={`sb-locale-${locale} space-y-6`} lang={locale}>
                        <header className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                            <div className="flex flex-wrap gap-2">
                                <span className="sb-vocab-badge">{fixtureCopy.fixture.sceneBadge}</span>
                                <Link href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)} className="sb-vocab-link">
                                    {manualCopy.scene.backToIndex}
                                </Link>
                                <Link href={withLangQuery('/manual/fixtures/vocabulary', locale, FIXTURE_DEFAULT_LOCALE)} className="sb-vocab-link">
                                    {fixtureCopy.fixture.vocabularyIndexLabel}
                                </Link>
                            </div>
                            <h1 className="sb-type-display-lg mt-4">{fixtureCopy.fixture.sceneTitle}</h1>
                            <p className="sb-type-body-lg mt-2 max-w-3xl">{fixtureCopy.fixture.sceneDescription}</p>
                        </header>
                        <div className="grid gap-4 xl:grid-cols-2">
                            <ReceiptCard
                                locale={locale}
                                title={locale === 'ko' ? '서명된 계약 영수증' : 'Signed contract receipt'}
                                receiptId="RCPT-131"
                                issuedAt="2026-04-08 15:42 UTC"
                                hash="0xreceipt131dca2179b"
                                contractVersion="SB-1.3"
                                signatory={locale === 'ko' ? '양측 서명 보관' : 'Dual-signature custody'}
                            />
                            <ReceiptCard
                                locale={locale}
                                title={locale === 'ko' ? '갱신된 조항 영수증' : 'Updated clause receipt'}
                                receiptId="RCPT-149"
                                issuedAt="2026-04-11 06:05 UTC"
                                hash="0xreceipt149f3bca881"
                                contractVersion="SB-1.4"
                                status="updated"
                            />
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
