'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { ProfileDossier, type ProfileDossierRecord } from '@/components/domain';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { getProfileDossierCopy } from '@/i18n/domain/profile-dossier';

function getProfileFixture(locale: 'en' | 'ko'): ProfileDossierRecord {
    return {
        displayName: locale === 'ko' ? '기록 SB-204' : 'Record SB-204',
        jurisdiction: locale === 'ko' ? '서울 관할' : 'Seoul jurisdiction',
        standingNote: locale === 'ko'
            ? '최소 도시에 범위 안에서 상태, 자격, 참조 줄만 표시합니다.'
            : 'Only standing, eligibility, and reference lines are shown within the minimal dossier scope.',
        trustLevel: 'verified',
        trustEvidence: [
            {
                label: locale === 'ko' ? '신원 검증 영수증' : 'Identity verification receipt',
                hash: '0xdossiertrust14fca918',
                ts: '2026-04-08 15:42 UTC',
            },
        ],
        eligibility: [
            { kind: 'identity', state: 'met' },
            { kind: 'consent', state: 'met' },
            { kind: 'contract', state: 'pending' },
            { kind: 'shared-context', state: 'met' },
        ],
        references: [
            {
                label: locale === 'ko' ? '기록 번호' : 'Dossier id',
                value: 'DOS-204',
            },
            {
                label: locale === 'ko' ? '참조 해시' : 'Reference hash',
                value: '0xdossier204e31cc8b',
            },
        ],
    };
}

export default function ManualVocabularyProfileDossierPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const fixtureCopy = getProfileDossierCopy(locale);
                const manualCopy = getManualFixturesCopy(locale);
                const profile = getProfileFixture(locale);

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
                            <ProfileDossier locale={locale} profile={profile} mode="minimal" />
                            <section className="sb-space-document rounded-[1.25rem] p-5 sm:p-6">
                                <div className="space-y-3">
                                    <p className="sb-vocab-label">{fixtureCopy.labels.extendedReserved}</p>
                                    <ProfileDossier locale={locale} profile={profile} mode="extended" />
                                    <p className="sb-type-meta">{fixtureCopy.labels.extendedReserved}</p>
                                </div>
                            </section>
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
