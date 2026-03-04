import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseEnv() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
        throw new Error('Missing Supabase env');
    }
    return { supabaseUrl, anonKey, serviceKey };
}

export async function POST(req: Request) {
    try {
        const { supabaseUrl, anonKey, serviceKey } = getSupabaseEnv();
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const authHeader = req.headers.get('Authorization');
        const cookieStore = await cookies();
        let supabaseAuth;

        if (authHeader) {
            supabaseAuth = createClient(supabaseUrl, anonKey, {
                global: { headers: { Authorization: authHeader } }
            });
        } else {
            supabaseAuth = createServerClient(supabaseUrl, anonKey, {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll() { },
                },
            });
        }

        const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { agreedTerms, agreedPrivacy } = body;

        if (!agreedTerms || !agreedPrivacy) {
            return NextResponse.json({ error: 'MISSING_CONSENT' }, { status: 400 });
        }

        const modules = ['OSINT', 'LOCATION', 'DEVICE'];
        const inserts = modules.map(m => ({
            user_id: user.id,
            module: m,
            is_granted: true,
            granted_at: new Date().toISOString(),
            terms_accepted: agreedTerms,
            privacy_accepted: agreedPrivacy,
            deep_profiling: true,
            marketing_accepted: false
        }));

        const { error } = await supabaseAdmin.from('consents').upsert(inserts, { onConflict: 'user_id, module' });

        if (error) {
            console.error('Consent Insert Error:', error);
            return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
        }

        // audit_logs is automatically populated via Postgres Trigger
        return NextResponse.json({ success: true });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'INTERNAL_ERROR';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
