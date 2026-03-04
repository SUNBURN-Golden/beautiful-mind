import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { timingSafeEqual } from 'crypto';

type AuthUser = {
    id: string;
};

type FeatureFlagRow = {
    enabled: boolean | null;
};

export function getServiceRoleClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing service-role Supabase env');
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

export function hasValidCronSecret(req: Request): boolean {
    const expected = process.env.CRON_SECRET;
    const provided = req.headers.get('x-cron-secret');
    if (!expected) {
        return false;
    }
    if (!provided) {
        return false;
    }

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');
    if (expectedBuf.length !== providedBuf.length) {
        return false;
    }

    return timingSafeEqual(expectedBuf, providedBuf);
}

export function isTestRouteEnabled(): boolean {
    return (
        process.env.ALLOW_TEST_API_ROUTES === 'true'
        || process.env.NEXT_PUBLIC_ALLOW_TEST_FEATURES === 'true'
    );
}

export async function getSessionUser(): Promise<AuthUser | null> {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return { id: user.id };
}

export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

    if (error || !profile) {
        return false;
    }

    return profile.is_admin === true;
}

export async function isFeatureEnabled(
    supabase: SupabaseClient,
    flagKey: string,
    fallback = false
): Promise<boolean> {
    const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .maybeSingle<FeatureFlagRow>();

    if (error || !data) {
        return fallback;
    }

    return data.enabled === true;
}
