'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { EligibilityChip } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { ELIGIBILITY_CHIP_KINDS, getEligibilityChipCopy } from '@/i18n/domain/eligibility-chip';

export default function ManualVocabularyEligibilityChipPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getEligibilityChipCopy(locale);
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
                        <div className="grid gap-4 lg:grid-cols-3">
                            {(['met', 'pending', 'locked'] as const).map((state) => (
                                <section key={state} className="sb-space-document rounded-[1.25rem] p-5 sm:p-6">
                                    <div className="space-y-4">
                                        <p className="sb-vocab-label">{fixtureCopy.states[state]}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {ELIGIBILITY_CHIP_KINDS.map((kind) => (
                                                <EligibilityChip
                                                    key={`${kind}-${state}`}
                                                    locale={locale}
                                                    kind={kind}
                                                    state={state}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
