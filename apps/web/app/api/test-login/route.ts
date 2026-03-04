import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
            },
            body: JSON.stringify({
                email: 'portone.test.1771824209879@example.com',
                password: 'SecurePassword123!'
            })
        });

        const data = await res.json();
        return NextResponse.json({
            status: res.status,
            requestUrl: url,
            headersSent: {
                apikeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.length,
                apikeyFirst5: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.substring(0, 5)
            },
            data
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, exception: e.message });
    }
}
