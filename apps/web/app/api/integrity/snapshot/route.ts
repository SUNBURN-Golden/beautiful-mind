import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const cronSecret = req.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        // 1. Verify cron secret
        if (!expectedSecret || cronSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Initialize Supabase Admin Client
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 3. Call the race-safe RPC
        const { data, error } = await supabaseAdmin.rpc('anchor_audit_logs_snapshot');

        if (error) {
            console.error('[Integrity Snapshot] RPC Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // RPC returns a table, but typically a single row
        const result = Array.isArray(data) && data.length > 0 ? data[0] : data || {};

        return NextResponse.json({
            success: true,
            anchor_id: result.anchor_id || null,
            count: result.count || 0,
            hash: result.hash || null
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal error';
        console.error('[Integrity Snapshot] Internal Error:', err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
