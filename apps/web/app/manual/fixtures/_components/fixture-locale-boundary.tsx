'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { FIXTURE_DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { useAppLocale } from '@/i18n/use-app-locale';

type FixtureLocaleBoundaryProps = {
    children: (locale: AppLocale) => ReactNode;
};

function FixtureLocaleResolved({ children }: FixtureLocaleBoundaryProps) {
    const locale = useAppLocale(FIXTURE_DEFAULT_LOCALE);
    return <>{children(locale)}</>;
}

export function FixtureLocaleBoundary({ children }: FixtureLocaleBoundaryProps) {
    return (
        <Suspense fallback={children(FIXTURE_DEFAULT_LOCALE)}>
            <FixtureLocaleResolved>{children}</FixtureLocaleResolved>
        </Suspense>
    );
}
