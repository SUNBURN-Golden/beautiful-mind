'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { AccessGate, type AccessGateStage } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getAccessGateCopy } from '@/i18n/domain/access-gate';

const accessGateStages: AccessGateStage[] = ['verify', 'consent', 'contract', 'passed'];

export default function ManualVocabularyAccessGatePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getAccessGateCopy(locale);
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
                            {accessGateStages.map((stage) => (
                                <AccessGate
                                    key={stage}
                                    locale={locale}
                                    stage={stage}
                                    references={[
                                        {
                                            label: locale === 'ko' ? '기록 번호' : 'Record id',
                                            value: `SB-GATE-${stage.toUpperCase()}-042`,
                                        },
                                        {
                                            label: locale === 'ko' ? '문서 해시' : 'Document hash',
                                            value: `0xgate${stage.padEnd(12, stage[0])}`,
                                        },
                                    ]}
                                />
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
