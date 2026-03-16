import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isRouteServiceError } from '@/lib/server/route-service-error';
import { unlockReviewSession } from '@/lib/server/review-unlock-service';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type UnlockBody = {
    session_id?: unknown;
};

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // no-op for route handler auth reads
                },
            },
        });

        const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({})) as UnlockBody;
        const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
        if (!sessionId) {
            return NextResponse.json({ error: 'session_id required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const result = await unlockReviewSession(supabaseAdmin, user.id, sessionId);
        return NextResponse.json(result);
    } catch (error: unknown) {
        if (isRouteServiceError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
