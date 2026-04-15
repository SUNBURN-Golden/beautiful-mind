'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import type { MatchSurfaceItem } from '@/components/surfaces/match-surface';
import { MatchSurface } from '@/components/surfaces/match-surface';
import { getMatchReadyEmptyFixture } from '@/dev-fixtures/match.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

function handleNoopRetry() {}
function handleNoopStatus() {}
function handleNoopConversation(_match: MatchSurfaceItem) {}

export default function ManualMatchReadyEmptyFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const matchLinks = [
                    { href: '/manual/fixtures/match/ready-error', label: copy.pages.matchReadyEmpty.links.error },
                    { href: '/manual/fixtures/match/ready-populated', label: copy.pages.matchReadyEmpty.links.populated },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.matchReadyEmpty.badge}
                        title={copy.pages.matchReadyEmpty.title}
                        description={copy.pages.matchReadyEmpty.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={matchLinks}
                    >
                        <MatchSurface
                            {...getMatchReadyEmptyFixture(locale)}
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
