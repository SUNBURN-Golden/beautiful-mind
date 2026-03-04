import { NextResponse } from 'next/server';
import { isTestRouteEnabled } from '@/lib/server/trust';

export async function GET() {
    if (!isTestRouteEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        has_supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        has_cron_secret: Boolean(process.env.CRON_SECRET)
    });
}
