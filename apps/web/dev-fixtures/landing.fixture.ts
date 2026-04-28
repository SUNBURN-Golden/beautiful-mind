import type { LandingSurfaceProps } from '@/components/surfaces/landing-surface';
import type { AppLocale } from '@/i18n/config';

export function getLandingDefaultFixture(_locale: AppLocale): LandingSurfaceProps {
    return {
        isSignedIn: false,
    };
}
