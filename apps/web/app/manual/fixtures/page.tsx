'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from './_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

export default function ManualFixturesIndexPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const fixtureGroups = [
                    {
                        title: copy.index.groups.landing,
                        routes: [
                            { href: '/manual/fixtures/landing', label: copy.index.routes.landingDefault },
                        ],
                    },
                    {
                        title: copy.index.groups.dashboard,
                        routes: [
                            { href: '/manual/fixtures/dashboard/loading', label: copy.index.routes.dashboardLoading },
                            { href: '/manual/fixtures/dashboard/non-active', label: copy.index.routes.dashboardNonActive },
                            { href: '/manual/fixtures/dashboard/active', label: copy.index.routes.dashboardActive },
                        ],
                    },
                    {
                        title: copy.index.groups.match,
                        routes: [
                            { href: '/manual/fixtures/match/status-loading', label: copy.index.routes.matchStatusLoading },
                            { href: '/manual/fixtures/match/non-active', label: copy.index.routes.matchNonActive },
                            { href: '/manual/fixtures/match/ready-empty', label: copy.index.routes.matchReadyEmpty },
                            { href: '/manual/fixtures/match/ready-error', label: copy.index.routes.matchReadyError },
                            { href: '/manual/fixtures/match/ready-populated', label: copy.index.routes.matchReadyPopulated },
                        ],
                    },
                ];

                return (
                    <section className="space-y-6">
                        <div className="liquid-pane rounded-2xl p-5 sm:p-6">
                            <h2 className="liquid-title text-[24px] font-semibold">{copy.index.title}</h2>
                            <p className="liquid-copy mt-2 max-w-3xl text-[14px] sm:text-[15px]">
                                {copy.index.description}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {fixtureGroups.map((group) => (
                                <article key={group.title} className="liquid-pane rounded-2xl p-5 sm:p-6">
                                    <h3 className="liquid-title text-[20px] font-semibold">{group.title}</h3>
                                    <div className="mt-4 flex flex-col gap-2">
                                        {group.routes.map((route) => (
                                            <Link
                                                key={route.href}
                                                href={withLangQuery(route.href, locale, FIXTURE_DEFAULT_LOCALE)}
                                                className="liquid-btn liquid-btn-secondary text-center"
                                            >
                                                {route.label}
                                            </Link>
                                        ))}
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
