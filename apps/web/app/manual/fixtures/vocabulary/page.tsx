'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getAccessGateCopy } from '@/i18n/domain/access-gate';
import { getCirclePanelCopy } from '@/i18n/domain/circle-panel';
import { getEligibilityChipCopy } from '@/i18n/domain/eligibility-chip';
import { getIntroductionTileCopy } from '@/i18n/domain/introduction-tile';
import { getProfileDossierCopy } from '@/i18n/domain/profile-dossier';
import { getReceiptCardCopy } from '@/i18n/domain/receipt-card';
import { getSharedContextRailCopy } from '@/i18n/domain/shared-context-rail';
import { getSignalStackCopy } from '@/i18n/domain/signal-stack';
import { getTrustRibbonCopy } from '@/i18n/domain/trust-ribbon';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const vocabularyIndexCopy = {
    en: {
        title: 'Vocabulary fixture index',
        description: 'Each route isolates one Phase 7 domain term so the vocabulary can be reviewed before any landing or dashboard redesign work.',
    },
    ko: {
        title: '어휘 픽스처 목록',
        description: '각 경로는 Phase 7의 도메인 용어 하나만 분리해 보여주며, 랜딩이나 대시보드 재설계보다 먼저 어휘를 검토할 수 있게 합니다.',
    },
} as const satisfies Record<AppLocale, { title: string; description: string }>;

export default function ManualVocabularyFixtureIndexPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = vocabularyIndexCopy[locale];
                const manualCopy = getManualFixturesCopy(locale);
                const routes = [
                    {
                        href: '/manual/fixtures/vocabulary/access-gate',
                        label: getAccessGateCopy(locale).fixture.routeLabel,
                        description: getAccessGateCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/trust-ribbon',
                        label: getTrustRibbonCopy(locale).fixture.routeLabel,
                        description: getTrustRibbonCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/eligibility-chip',
                        label: getEligibilityChipCopy(locale).fixture.routeLabel,
                        description: getEligibilityChipCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/circle-panel',
                        label: getCirclePanelCopy(locale).fixture.routeLabel,
                        description: getCirclePanelCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/introduction-tile',
                        label: getIntroductionTileCopy(locale).fixture.routeLabel,
                        description: getIntroductionTileCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/shared-context-rail',
                        label: getSharedContextRailCopy(locale).fixture.routeLabel,
                        description: getSharedContextRailCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/signal-stack',
                        label: getSignalStackCopy(locale).fixture.routeLabel,
                        description: getSignalStackCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/profile-dossier',
                        label: getProfileDossierCopy(locale).fixture.routeLabel,
                        description: getProfileDossierCopy(locale).fixture.sceneDescription,
                    },
                    {
                        href: '/manual/fixtures/vocabulary/receipt-card',
                        label: getReceiptCardCopy(locale).fixture.routeLabel,
                        description: getReceiptCardCopy(locale).fixture.sceneDescription,
                    },
                ];

                return (
                    <section className={`sb-locale-${locale} space-y-6`} lang={locale}>
                        <header className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                            <div className="flex flex-wrap gap-2">
                                <span className="sb-vocab-badge">{locale === 'ko' ? '어휘 픽스처' : 'Vocabulary fixture'}</span>
                                <Link
                                    href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)}
                                    className="sb-vocab-link"
                                >
                                    {manualCopy.scene.backToIndex}
                                </Link>
                            </div>
                            <h2 className="sb-type-display-lg mt-4">{copy.title}</h2>
                            <p className="sb-type-body-lg mt-2 max-w-3xl">
                                {copy.description}
                            </p>
                        </header>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {routes.map((route) => (
                                <article key={route.href} className="sb-space-document rounded-[1.25rem] p-5 sm:p-6">
                                    <h3 className="sb-type-headline">{route.label}</h3>
                                    <p className="sb-type-body mt-2">{route.description}</p>
                                    <div className="mt-4">
                                        <Link
                                            href={withLangQuery(route.href, locale, FIXTURE_DEFAULT_LOCALE)}
                                            className="sb-vocab-link"
                                        >
                                            {route.label}
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
