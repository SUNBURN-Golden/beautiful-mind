'use client';

import { useSearchParams } from 'next/navigation';
import { LIVE_DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from './config';

export function useAppLocale(fallback: AppLocale = LIVE_DEFAULT_LOCALE): AppLocale {
    const searchParams = useSearchParams();
    return resolveAppLocale(searchParams.get('lang'), fallback);
}
