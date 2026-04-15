export type AppLocale = 'en' | 'ko';

export const LIVE_DEFAULT_LOCALE: AppLocale = 'en';
export const FIXTURE_DEFAULT_LOCALE: AppLocale = 'en';

export function resolveAppLocale(
    value: string | string[] | null | undefined,
    fallback: AppLocale = LIVE_DEFAULT_LOCALE,
): AppLocale {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized === 'en' || normalized === 'ko') {
        return normalized;
    }
    return fallback;
}

export function withLangQuery(
    href: string,
    locale: AppLocale,
    fallback: AppLocale = LIVE_DEFAULT_LOCALE,
): string {
    const [pathname, query = ''] = href.split('?');
    const params = new URLSearchParams(query);

    if (locale === fallback) {
        params.delete('lang');
    } else {
        params.set('lang', locale);
    }

    const serialized = params.toString();
    return serialized ? `${pathname}?${serialized}` : pathname;
}
