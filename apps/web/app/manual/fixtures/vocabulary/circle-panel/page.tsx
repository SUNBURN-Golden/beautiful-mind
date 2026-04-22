'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { CirclePanel, type CirclePanelRecord } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getCirclePanelCopy } from '@/i18n/domain/circle-panel';

function getCircleFixtures(locale: 'en' | 'ko'): CirclePanelRecord[] {
    return [
        {
            id: 'institution-lens',
            title: locale === 'ko' ? '기관 근거 렌즈' : 'Institution-backed lens',
            note: locale === 'ko'
                ? '동일 기관 검증 기록과 공동 서명 문서가 연결된 정적 렌즈입니다.'
                : 'A static lens anchored by the same institution verification records and co-signed documents.',
            lens: 'institution',
            lastReviewedAt: '2026-04-11',
            evidence: [
                {
                    id: '1',
                    label: locale === 'ko' ? '기관 재직 증명' : 'Institution attestation',
                    hash: '0xinstc7df9132e4',
                    note: locale === 'ko' ? '동일 기관 발급 확인서 일치' : 'Matching institution attestation',
                },
                {
                    id: '2',
                    label: locale === 'ko' ? '공동 서명 문서' : 'Co-signed document',
                    contractVersion: 'SB-1.2',
                    note: locale === 'ko' ? '동일 문서 버전 공동 서명' : 'Shared document version',
                },
            ],
        },
        {
            id: 'contract-lens',
            title: locale === 'ko' ? '계약 렌즈' : 'Contract-aligned lens',
            note: locale === 'ko'
                ? '현재 계약 버전과 동일한 조항 묶음이 연결된 읽기 전용 렌즈입니다.'
                : 'A read-only lens tied to the same active contract version and clause packet.',
            lens: 'contract',
            lastReviewedAt: '2026-04-13',
            evidence: [
                {
                    id: '3',
                    label: locale === 'ko' ? '계약 조항 묶음' : 'Clause packet',
                    contractVersion: 'SB-1.3',
                    hash: '0xcontractpacketbb319f2a',
                },
            ],
        },
    ];
}

export default function ManualVocabularyCirclePanelPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getCirclePanelCopy(locale);
                const manualCopy = getManualFixturesCopy(locale);
                const circles = getCircleFixtures(locale);

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
                            {circles.map((circle) => (
                                <CirclePanel key={circle.id} locale={locale} circle={circle} />
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
