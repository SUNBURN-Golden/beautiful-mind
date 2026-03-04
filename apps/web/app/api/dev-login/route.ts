import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isTestRouteEnabled } from '@/lib/server/trust';

export async function GET(request: Request) {
    if (!isTestRouteEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password') || process.env.E2E_TEST_PASSWORD || '';

    if (!email || !password) {
        return NextResponse.json({ error: 'Missing email/password' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.redirect(new URL('/onboarding', request.url));
}
