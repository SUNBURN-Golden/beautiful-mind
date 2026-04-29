import { resolveAppLocale, LIVE_DEFAULT_LOCALE } from '@/i18n/config';
import { CollateralSurface } from '@/components/surfaces/collateral-surface';

export default async function CollateralPage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string | string[] }>;
}) {
    const params = await searchParams;
    const locale = resolveAppLocale(params.lang, LIVE_DEFAULT_LOCALE);
    return <CollateralSurface locale={locale} />;
}
