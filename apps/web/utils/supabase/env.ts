type PublicSupabaseEnv = {
    url: string;
    anonKey: string;
};

export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return null;
    }

    return { url, anonKey };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
    const env = getPublicSupabaseEnv();
    if (env) {
        return env;
    }

    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    throw new Error(`Missing required Supabase env: ${missing.join(', ')}`);
}
