'use client';

import { FixtureLocaleBoundary } from '../_components/fixture-locale-boundary';
import { LandingSurface } from '@/components/surfaces/landing-surface';
import { getLandingDefaultFixture } from '@/dev-fixtures/landing.fixture';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureScene } from '../_components/fixture-scene';

export default function ManualLandingFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = getManualFixturesCopy(locale);

                return (
                    <FixtureScene
                        badge={copy.pages.landingDefault.badge}
                        title={copy.pages.landingDefault.title}
                        description={copy.pages.landingDefault.description}
                        locale={locale}
                        indexLabel={copy.scene.backToIndex}
                    >
                        <LandingSurface {...getLandingDefaultFixture(locale)} locale={locale} />
                    </FixtureScene>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
