'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { FixtureLocaleBoundary } from './_components/fixture-locale-boundary';
import { LocaleSwitch } from '@/components/surfaces/locale-switch';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

export default function ManualFixturesLayout({ children }: { children: ReactNode }) {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);

                return (
                    <main className={`liquid-shell sb-stage-shell sb-manual-stage sb-locale-${locale} px-4 pb-14 pt-10 sm:px-8 sm:pt-14`} lang={locale}>
                        <div className="mx-auto max-w-6xl space-y-8">
                            <header className="sb-stage-hero-panel sb-manual-hero liquid-rise space-y-4">
                                <div className="sb-surface-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="liquid-chip sb-surface-kicker inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                                        {copy.layout.badge}
                                    </div>
                                    <LocaleSwitch
                                        currentLocale={locale}
                                        fallbackLocale={FIXTURE_DEFAULT_LOCALE}
                                        label={copy.localeSwitch.label}
                                        englishLabel={copy.localeSwitch.english}
                                        koreanLabel={copy.localeSwitch.korean}
                                    />
                                </div>
                                <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                                    {copy.layout.title}
                                </h1>
                                <p className="liquid-copy max-w-3xl text-[15px] sm:text-[16px]">
                                    {copy.layout.description}
                                </p>
                                <div className="sb-action-cluster sb-manual-actions flex flex-wrap gap-3">
                                    <Link href={withLangQuery('/manual', locale, FIXTURE_DEFAULT_LOCALE)} className="liquid-btn sb-pill-action sb-pill-action-inline sb-pill-action-glass sb-manual-utility sb-manual-utility-secondary">
                                        {copy.layout.backToManual}
                                    </Link>
                                    <Link href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)} className="liquid-btn sb-pill-action sb-pill-action-inline sb-pill-action-ivory sb-manual-utility sb-manual-utility-primary">
                                        {copy.layout.viewIndex}
                                    </Link>
                                </div>
                            </header>

                            {children}
                        </div>
                    </main>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
