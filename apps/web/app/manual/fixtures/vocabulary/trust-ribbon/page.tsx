'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { TrustRibbon, type TrustRibbonLevel } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getTrustRibbonCopy } from '@/i18n/domain/trust-ribbon';

const levels: TrustRibbonLevel[] = ['verified', 'partial', 'pending', 'none'];

export default function ManualVocabularyTrustRibbonPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getTrustRibbonCopy(locale);
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
                        <div className="grid gap-4">
                            {levels.map((level) => (
                                <TrustRibbon
                                    key={level}
                                    locale={locale}
                                    level={level}
                                    evidence={level === 'none' ? [] : [
                                        {
                                            label: locale === 'ko' ? '검토 묶음 A' : 'Review packet A',
                                            hash: `0xtrust${level.padEnd(10, level[0])}`,
                                            ts: level === 'pending' ? '2026-04-10 09:15 UTC' : '2026-04-09 18:30 UTC',
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
