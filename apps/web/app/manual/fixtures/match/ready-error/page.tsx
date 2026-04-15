'use client';

import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import type { MatchSurfaceItem } from '@/components/surfaces/match-surface';
import { MatchSurface } from '@/components/surfaces/match-surface';
import { getMatchReadyErrorFixture } from '@/dev-fixtures/match.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../../_components/fixture-scene';

function handleNoopRetry() {}
function handleNoopStatus() {}
function handleNoopConversation(_match: MatchSurfaceItem) {}

export default function ManualMatchReadyErrorFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);
                const matchLinks = [
                    { href: '/manual/fixtures/match/ready-empty', label: copy.pages.matchReadyError.links.empty },
                    { href: '/manual/fixtures/match/ready-populated', label: copy.pages.matchReadyError.links.populated },
                ];

                return (
                    <FixtureScene
                        badge={copy.pages.matchReadyError.badge}
                        title={copy.pages.matchReadyError.title}
                        description={copy.pages.matchReadyError.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                        links={matchLinks}
                    >
                        <MatchSurface
                            {...getMatchReadyErrorFixture(locale)}
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
