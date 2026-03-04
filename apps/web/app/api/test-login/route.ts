import { NextResponse } from 'next/server';
import { isTestRouteEnabled } from '@/lib/server/trust';

export async function GET() {
    try {
        if (!isTestRouteEnabled()) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const email = process.env.E2E_TEST_EMAIL;
        const password = process.env.E2E_TEST_PASSWORD;
        if (!email || !password) {
            return NextResponse.json({ error: 'E2E_TEST_EMAIL or E2E_TEST_PASSWORD is not configured.' }, { status: 400 });
        }

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await res.json();
        return NextResponse.json({
            status: res.status,
            data
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ success: false, exception: message }, { status: 500 });
    }
}
