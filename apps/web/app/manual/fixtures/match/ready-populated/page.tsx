'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import type { MatchSurfaceItem } from '@/components/surfaces/match-surface';
import { MatchSurface } from '@/components/surfaces/match-surface';
import { getMatchReadyPopulatedFixture } from '@/dev-fixtures/match.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

function handleNoopRetry() {}
function handleNoopStatus() {}
function handleNoopConversation(_match: MatchSurfaceItem) {}

export default function ManualMatchReadyPopulatedFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const matchLinks = [
                    { href: '/manual/fixtures/match/ready-empty', label: copy.pages.matchReadyPopulated.links.empty },
                    { href: '/manual/fixtures/match/ready-error', label: copy.pages.matchReadyPopulated.links.error },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.matchReadyPopulated.badge}
                        title={copy.pages.matchReadyPopulated.title}
                        description={copy.pages.matchReadyPopulated.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={matchLinks}
                    >
                        <MatchSurface
                            {...getMatchReadyPopulatedFixture(locale)}
                            locale={locale}
                            onRetry={handleNoopRetry}
                            onViewStatus={handleNoopStatus}
                            onOpenConversation={handleNoopConversation}
                        />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
