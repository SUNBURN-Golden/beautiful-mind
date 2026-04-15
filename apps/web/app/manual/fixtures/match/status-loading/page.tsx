'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { MatchSurface } from '@/components/surfaces/match-surface';
import { matchStatusLoadingFixture } from '@/dev-fixtures/match.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

export default function ManualMatchStatusLoadingFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const matchLinks = [
                    { href: '/manual/fixtures/match/non-active', label: copy.pages.matchStatusLoading.links.nonActive },
                    { href: '/manual/fixtures/match/ready-populated', label: copy.pages.matchStatusLoading.links.populated },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.matchStatusLoading.badge}
                        title={copy.pages.matchStatusLoading.title}
                        description={copy.pages.matchStatusLoading.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={matchLinks}
                    >
                        <MatchSurface {...matchStatusLoadingFixture} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
