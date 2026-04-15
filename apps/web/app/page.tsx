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
    const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    const commitShort = commit && commit.length >= 7 ? commit.slice(0, 7) : 'local';
    const params = searchParams ? await searchParams : undefined;
    const locale = resolveAppLocale(params?.lang, LIVE_DEFAULT_LOCALE);

    return <LandingSurface isSignedIn={isSignedIn} commitShort={commitShort} locale={locale} />;
}
