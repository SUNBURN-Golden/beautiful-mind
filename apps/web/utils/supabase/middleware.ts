import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseEnv } from './env';
import {
    resolveMiddlewareRedirect,
    type MiddlewareRedirectDecision,
} from '@/lib/server/middleware-access';

type AdmissionGateState = {
    isActive: boolean;
};

function toRedirectResponse(request: NextRequest, decision: MiddlewareRedirectDecision): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    if (decision.searchParams) {
        for (const [key, value] of Object.entries(decision.searchParams)) {
            url.searchParams.set(key, value);
        }
    }
    return NextResponse.redirect(url);
}

async function getAdmissionGateState(
    supabase: ReturnType<typeof createServerClient>,
    userId: string
): Promise<AdmissionGateState> {
    const [{ data: app }, { data: soul }] = await Promise.all([
        supabase
            .from('admission_applications')
            .select('status')
            .eq('user_id', userId)
            .maybeSingle(),
        supabase
            .from('soul_credentials')
            .select('status')
            .eq('user_id', userId)
            .eq('status', 'ISSUED')
            .maybeSingle(),
    ]);

    return {
        isActive: app?.status === 'ACTIVE' && soul?.status === 'ISSUED',
    };
}

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    const publicEnv = getPublicSupabaseEnv();
    if (!publicEnv) {
        const decision = resolveMiddlewareRedirect({
            pathname,
            hasPublicEnv: false,
            hasUser: false,
        });
        if (decision) {
            return toRedirectResponse(request, decision);
        }
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });
    const supabase = createServerClient(publicEnv.url, publicEnv.anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => {
                    supabaseResponse.cookies.set(name, value, options);
                });
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        const decision = resolveMiddlewareRedirect({
            pathname,
            hasPublicEnv: true,
            hasUser: false,
        });
        if (decision) {
            return toRedirectResponse(request, decision);
        }
        return supabaseResponse;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, banned, is_frozen')
        .eq('id', user.id)
        .single();

    if (profile?.banned) {
        await supabase.auth.signOut();
        const decision = resolveMiddlewareRedirect({
            pathname,
            hasPublicEnv: true,
            hasUser: true,
            isBanned: true,
        });
        if (decision) {
            return toRedirectResponse(request, decision);
        }
    }

    const gate = await getAdmissionGateState(supabase, user.id);
    const decision = resolveMiddlewareRedirect({
        pathname,
        hasPublicEnv: true,
        hasUser: true,
        isAdmin: profile?.is_admin === true,
        isFrozen: profile?.is_frozen === true,
        isActive: gate.isActive,
    });
    if (decision) {
        return toRedirectResponse(request, decision);
    }

    return supabaseResponse;
}
