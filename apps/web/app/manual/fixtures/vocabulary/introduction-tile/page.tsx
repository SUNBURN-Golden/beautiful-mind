'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { IntroductionTile } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getIntroductionTileCopy } from '@/i18n/domain/introduction-tile';

export default function ManualVocabularyIntroductionTilePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getIntroductionTileCopy(locale);
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
                            <IntroductionTile
                                locale={locale}
                                state="documented"
                                sponsorLabel={locale === 'ko' ? '중립 검토 담당' : 'Neutral review steward'}
                                counterpartLabel={locale === 'ko' ? '상대 기록 SB-204' : 'Counterpart record SB-204'}
                                sharedBasis={locale === 'ko'
                                    ? '동일 기관 검증 기록과 공동 계약 조항 확인'
                                    : 'Shared institution verification record and aligned contract clause packet'}
                                referenceHash="0xintrodoc9a72ff0b"
                                contractVersion="SB-1.3"
                            />
                            <IntroductionTile
                                locale={locale}
                                state="held"
                                sponsorLabel={locale === 'ko' ? '서명 검토 보관자' : 'Signature review custodian'}
                                counterpartLabel={locale === 'ko' ? '상대 기록 SB-319' : 'Counterpart record SB-319'}
                                sharedBasis={locale === 'ko'
                                    ? '문서 근거는 확보되었으나 라이브 승격은 보류'
                                    : 'Documentary basis is present, but live promotion remains held'}
                                referenceHash="0xintroheld14c20e77"
                            />
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
