'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { DashboardSurface } from '@/components/surfaces/dashboard-surface';
import { getDashboardNonActiveFixture } from '@/dev-fixtures/dashboard.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

export default function ManualDashboardNonActiveFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const dashboardLinks = [
                    { href: '/manual/fixtures/dashboard/loading', label: copy.pages.dashboardNonActive.links.loading },
                    { href: '/manual/fixtures/dashboard/active', label: copy.pages.dashboardNonActive.links.active },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.dashboardNonActive.badge}
                        title={copy.pages.dashboardNonActive.title}
                        description={copy.pages.dashboardNonActive.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={dashboardLinks}
                    >
                        <DashboardSurface {...getDashboardNonActiveFixture(locale)} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
