'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { SharedContextRail, type SharedContextRailItem } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getSharedContextRailCopy } from '@/i18n/domain/shared-context-rail';

function getSharedContextItems(locale: 'en' | 'ko'): SharedContextRailItem[] {
    return [
        {
            id: 'institution',
            kind: 'institution',
            label: locale === 'ko' ? '동일 기관 확인' : 'Matched institution record',
            evidence: locale === 'ko'
                ? '양측 기록 모두 동일 기관 발급 확인서를 보유합니다.'
                : 'Both records hold attestations issued by the same institution.',
            hash: '0xsharedinst671c8a2b',
        },
        {
            id: 'jurisdiction',
            kind: 'jurisdiction',
            label: locale === 'ko' ? '동일 관할 계약' : 'Shared contract jurisdiction',
            evidence: locale === 'ko'
                ? '현재 계약 버전의 관할 조항이 일치합니다.'
                : 'The governing jurisdiction clause matches on the active contract version.',
        },
        {
            id: 'credential',
            kind: 'credential',
            label: locale === 'ko' ? '자격 증빙 정합' : 'Credential alignment',
            evidence: locale === 'ko'
                ? '제출된 자격 문서 묶음이 동일 분류에 속합니다.'
                : 'The submitted credential packets fall under the same verified category.',
            hash: '0xsharedcred5fa42de1',
        },
    ];
}

export default function ManualVocabularySharedContextRailPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getSharedContextRailCopy(locale);
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
                            <SharedContextRail locale={locale} items={getSharedContextItems(locale)} />
                            <SharedContextRail locale={locale} items={[]} />
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
