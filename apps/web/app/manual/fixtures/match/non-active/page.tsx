'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { MatchSurface } from '@/components/surfaces/match-surface';
import { getMatchNonActiveFixture } from '@/dev-fixtures/match.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

export default function ManualMatchNonActiveFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const matchLinks = [
                    { href: '/manual/fixtures/match/status-loading', label: copy.pages.matchNonActive.links.loading },
                    { href: '/manual/fixtures/match/ready-populated', label: copy.pages.matchNonActive.links.populated },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.matchNonActive.badge}
                        title={copy.pages.matchNonActive.title}
                        description={copy.pages.matchNonActive.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={matchLinks}
                    >
                        <MatchSurface {...getMatchNonActiveFixture(locale)} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
