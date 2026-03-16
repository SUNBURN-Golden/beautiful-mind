import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isTestRouteEnabled } from '@/lib/server/trust';
import { verifyIdentityForUser } from '@/lib/server/admission-identity-verify';

function getSupabaseEnv() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
        throw new Error('Missing Supabase env');
    }
    return { supabaseUrl, anonKey, serviceKey };
}

type VerifyBody = {
    identityVerificationId?: unknown;
    name?: unknown;
    phone?: unknown;
};

export async function POST(req: Request) {
    try {
        const { supabaseUrl, anonKey, serviceKey } = getSupabaseEnv();
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const body = await req.json().catch(() => ({})) as VerifyBody;

        const cookieStore = await cookies();
        const supabase = createServerClient(supabaseUrl, anonKey, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // no-op for read-only auth flow
                },
            },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
                { status: 401 },
            );
        }

        const result = await verifyIdentityForUser(
            supabaseAdmin,
            user.id,
            {
                identityVerificationId: body.identityVerificationId,
                name: body.name,
                phone: body.phone,
            },
            {
                isTestRouteEnabled: isTestRouteEnabled(),
                portOneApiSecret: process.env.PORTONE_API_SECRET,
                fetchImpl: fetch,
            },
        );

        return NextResponse.json(result.payload, { status: result.status });
    } catch (e: unknown) {
        console.error('verify/complete route failed:', e);
        const message = e instanceof Error ? e.message : 'INTERNAL_ERROR';
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message } },
            { status: 500 },
        );
    }
}
