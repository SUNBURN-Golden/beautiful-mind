'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { DashboardSurface } from '@/components/surfaces/dashboard-surface';
import { getDashboardActiveFixture } from '@/dev-fixtures/dashboard.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

export default function ManualDashboardActiveFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const dashboardLinks = [
                    { href: '/manual/fixtures/dashboard/loading', label: copy.pages.dashboardActive.links.loading },
                    { href: '/manual/fixtures/dashboard/non-active', label: copy.pages.dashboardActive.links.nonActive },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.dashboardActive.badge}
                        title={copy.pages.dashboardActive.title}
                        description={copy.pages.dashboardActive.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={dashboardLinks}
                    >
                        <DashboardSurface {...getDashboardActiveFixture(locale)} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
