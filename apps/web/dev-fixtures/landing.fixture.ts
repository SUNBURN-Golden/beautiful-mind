import type { LandingSurfaceProps } from '@/components/surfaces/landing-surface';
import type { AppLocale } from '@/i18n/config';

const landingFixtureCommit: Record<AppLocale, string> = {
    en: 'fixture-demo',
    ko: '픽스처-데모',
};

export function getLandingDefaultFixture(locale: AppLocale): LandingSurfaceProps {
    return {
        isSignedIn: false,
        commitShort: landingFixtureCommit[locale],
    };
}
