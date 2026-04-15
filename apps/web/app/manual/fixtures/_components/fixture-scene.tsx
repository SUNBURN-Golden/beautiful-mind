import type { ReactNode } from 'react';
import Link from 'next/link';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';

type FixtureSceneLink = {
    href: string;
    label: string;
};

type FixtureSceneProps = {
    badge: string;
    title: string;
    description: string;
    locale: AppLocale;
    indexLabel: string;
    links?: FixtureSceneLink[];
    children: ReactNode;
};

export function FixtureScene({ badge, title, description, locale, indexLabel, links = [], children }: FixtureSceneProps) {
    return (
        <section className="space-y-5">
            <div className="sb-surface-panel sb-manual-scene liquid-rise rounded-3xl p-5 sm:p-6">
                <div className="space-y-3">
                    <div className="liquid-chip sb-surface-kicker inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                        {badge}
                    </div>
                    <div className="space-y-2">
                        <h2 className="liquid-title text-[24px] font-semibold sm:text-[28px]">{title}</h2>
                        <p className="liquid-copy max-w-3xl text-[14px] sm:text-[15px]">{description}</p>
                    </div>
                    <div className="sb-manual-link-grid flex flex-wrap gap-2">
                        <Link href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)} className="liquid-btn sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-manual-link">
                            {indexLabel}
                        </Link>
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={withLangQuery(link.href, locale, FIXTURE_DEFAULT_LOCALE)}
                                className="liquid-btn sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-manual-link"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {children}
        </section>
    );
}
