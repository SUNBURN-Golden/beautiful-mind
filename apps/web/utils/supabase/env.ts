import { z } from 'zod';

type PublicSupabaseEnv = {
    url: string;
    anonKey: string;
};

const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
    const parsed = envSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    if (!parsed.success) {
        return null;
    }

    return {
        url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
    const env = getPublicSupabaseEnv();
    if (env) {
        return env;
    }

    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    throw new Error(`Invalid or missing required Supabase env: ${missing.join(', ')}`);
}
