'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { DashboardSurface } from '@/components/surfaces/dashboard-surface';
import { dashboardLoadingFixture } from '@/dev-fixtures/dashboard.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

export default function ManualDashboardLoadingFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const dashboardLinks = [
                    { href: '/manual/fixtures/dashboard/non-active', label: copy.pages.dashboardLoading.links.nonActive },
                    { href: '/manual/fixtures/dashboard/active', label: copy.pages.dashboardLoading.links.active },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.dashboardLoading.badge}
                        title={copy.pages.dashboardLoading.title}
                        description={copy.pages.dashboardLoading.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={dashboardLinks}
                    >
                        <DashboardSurface {...dashboardLoadingFixture} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
