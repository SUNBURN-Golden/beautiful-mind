import { resolveAppLocale, LIVE_DEFAULT_LOCALE } from '@/i18n/config';
import { ChallengeSurface } from '@/components/surfaces/challenge-surface';

export default async function ChallengePage({
    searchParams,
}: {
    searchParams: Promise<{ lang?: string | string[] }>;
}) {
    const params = await searchParams;
    const locale = resolveAppLocale(params.lang, LIVE_DEFAULT_LOCALE);
    return <ChallengeSurface locale={locale} />;
}
