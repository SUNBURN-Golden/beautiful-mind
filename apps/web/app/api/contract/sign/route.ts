import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase Admin Env");
    return createClient(url, key);
};

export async function POST(req: Request) {
    try {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAdmin = getAdminClient();
        // 1. Auth Check - Support both Cookies and Authorization Header
        const cookieStore = await cookies();
        let supabaseAuth;

        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            supabaseAuth = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: authHeader } }
            });
        } else {
            supabaseAuth = createServerClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
        const { signatureData, simulate_409 } = body;

        if (!signatureData) {
            return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
        }

        if (simulate_409) {
            return NextResponse.json({ error: 'VERSION_MISMATCH' }, { status: 409 });
        }

        const { error } = await supabaseAdmin.from('contracts').insert({
            user_id: user.id,
            signature_base64: signatureData,
            agreed_to_terms: true
        });

        if (error) {
            console.error('Contract Insert Error:', error);
            return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
        }

        // audit_logs is automatically populated via Postgres Trigger
        return NextResponse.json({
            success: true,
            nextStep: 'AI_INTERVIEW',
            message: 'Signature recorded'
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'SERVER_ERROR';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
