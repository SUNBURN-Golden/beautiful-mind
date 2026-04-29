import { resolveAppLocale, LIVE_DEFAULT_LOCALE } from '@/i18n/config';
import { UnlockSurface } from '@/components/surfaces/unlock-surface';

export default async function UnlockPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string | string[] }>;
}) {
    const params = await searchParams;
    const locale = resolveAppLocale(params.lang, LIVE_DEFAULT_LOCALE);
    return <UnlockSurface locale={locale} />;
}
