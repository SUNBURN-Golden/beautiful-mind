'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { SignalStack, type SignalStackItem } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getSignalStackCopy } from '@/i18n/domain/signal-stack';

function getSignalFixtures(): SignalStackItem[] {
    return [
        {
            id: 'signal-1',
            kind: 'verify.id.completed',
            hash: '0xverifyidc87f0211',
            receiptId: 'RCPT-104',
            occurredAt: '2026-04-06 08:20 UTC',
        },
        {
            id: 'signal-2',
            kind: 'verify.doc.completed',
            hash: '0xverifydoc7b113f4c',
            receiptId: 'RCPT-108',
            occurredAt: '2026-04-06 08:41 UTC',
        },
        {
            id: 'signal-3',
            kind: 'consent.clause.signed',
            hash: '0xconsent33dd90ef',
            contractVersion: 'SB-1.2',
            receiptId: 'RCPT-120',
            occurredAt: '2026-04-07 10:15 UTC',
        },
        {
            id: 'signal-4',
            kind: 'contract.signed',
            contractVersion: 'SB-1.3',
            hash: '0xcontractsigned48aa7320',
            receiptId: 'RCPT-131',
            occurredAt: '2026-04-08 15:42 UTC',
        },
        {
            id: 'signal-5',
            kind: 'contract.updated',
            contractVersion: 'SB-1.4',
            hash: '0xcontractupdatedaf32019e',
            receiptId: 'RCPT-149',
            occurredAt: '2026-04-11 06:05 UTC',
        },
        {
            id: 'signal-6',
            kind: 'receipt.generated',
            hash: '0xreceiptgen110df8b4',
            receiptId: 'RCPT-152',
            occurredAt: '2026-04-11 06:07 UTC',
        },
    ];
}

export default function ManualVocabularySignalStackPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getSignalStackCopy(locale);
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
                            <SignalStack locale={locale} items={getSignalFixtures()} />
                            <SignalStack locale={locale} items={[]} />
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
