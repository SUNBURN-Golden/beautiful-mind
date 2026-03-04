import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined',
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    });
}
