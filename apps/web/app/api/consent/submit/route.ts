import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const supabaseAuth = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: authHeader } }
        });

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
            granted_at: new Date().toISOString()
        }));

        const { error } = await supabaseAdmin.from('consents').upsert(inserts, { onConflict: 'user_id, module' });

        if (error) {
            console.error('Consent Insert Error:', error);
            return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
        }

        // audit_logs is automatically populated via Postgres Trigger
        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
