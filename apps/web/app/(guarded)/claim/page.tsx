import { resolveAppLocale, LIVE_DEFAULT_LOCALE } from '@/i18n/config';
import { ClaimSurface } from '@/components/surfaces/claim-surface';

export default async function ClaimPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string | string[] }>;
}) {
    const params = await searchParams;
    const locale = resolveAppLocale(params.lang, LIVE_DEFAULT_LOCALE);
    return <ClaimSurface locale={locale} />;
}
