import { LandingSurface } from '@/components/surfaces/landing-surface';
import { LIVE_DEFAULT_LOCALE, resolveAppLocale } from '@/i18n/config';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type HomePageProps = {
    searchParams?: Promise<{
        lang?: string | string[];
    }>;
};

async function hasActiveSession(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return Boolean(user);
    } catch (error) {
        console.error('Home session probe failed:', error);
        return false;
    }
}

export default async function HomePage({ searchParams }: HomePageProps) {
    const isSignedIn = await hasActiveSession();
    const params = searchParams ? await searchParams : undefined;
    const locale = resolveAppLocale(params?.lang, LIVE_DEFAULT_LOCALE);

    return <LandingSurface isSignedIn={isSignedIn} locale={locale} />;
}
