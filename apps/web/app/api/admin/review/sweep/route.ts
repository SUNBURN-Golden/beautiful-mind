import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAdminReviewSweep } from '@/lib/server/admin-review-sweep';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-cron-secret');
        if (authHeader !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { slashesApplied, finalizationsApplied } = await runAdminReviewSweep(supabase);

        return NextResponse.json({
            success: true,
            slashesApplied,
            finalizationsApplied
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
