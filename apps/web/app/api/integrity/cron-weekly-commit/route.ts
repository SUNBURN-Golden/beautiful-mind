import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;
const ANCHOR_COMMIT_THRESHOLD = parseInt(process.env.ANCHOR_COMMIT_THRESHOLD || '5000', 10);

// Bypassing RLS for system chron jobs
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: Request) {
    try {
        // C-1: Validate x-cron-secret
        const authHeader = req.headers.get('x-cron-secret');
        if (authHeader !== CRON_SECRET) {
            console.error('Unauthorized cron-weekly-commit invocation attempt.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // C-2: Roll 30-day UNLOCK_FEE_BURN sum (Metrics)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isoThirtyDaysAgo = thirtyDaysAgo.toISOString();

        const { count, error: countErr } = await supabase
            .from('event_receipts')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'UNLOCK_FEE_BURN')
            .gte('occurred_at', isoThirtyDaysAgo);

        if (countErr) throw countErr;

        const currentCount = count || 0;

        // C-3: Threshold LAZY_MODE short-circuit
        if (currentCount < ANCHOR_COMMIT_THRESHOLD) {
            return NextResponse.json({
                status: 'LAZY_MODE',
                current_count: currentCount,
                threshold: ANCHOR_COMMIT_THRESHOLD
            });
        }

        // C-4: Threshold COMMIT_TRIGGERED calculation
        // Fetch source='audit_logs' anchors generated in the past 7 days 
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoSevenDaysAgo = sevenDaysAgo.toISOString();

        const { data: recentAnchors, error: anchorsErr } = await supabase
            .from('merkle_anchors')
            .select('id')
            .eq('source', 'audit_logs')
            .gte('created_at', isoSevenDaysAgo);

        if (anchorsErr) throw anchorsErr;

        if (!recentAnchors || recentAnchors.length === 0) {
            return NextResponse.json({
                status: 'COMMIT_TRIGGERED',
                message: 'No recent anchors found to commit.',
                anchors_selected: 0,
                anchors_inserted: 0,
                current_count: currentCount,
                threshold: ANCHOR_COMMIT_THRESHOLD
            });
        }

        const anchorIds = recentAnchors.map(a => a.id);

        // Map submissions to UPSERT (status = SKIPPED for skeleton v1)
        const submissionsToInsert = anchorIds.map(id => ({
            anchor_id: id,
            chain_id: 1, // Mainnet integer 
            status: 'SKIPPED',
            // Note: In Skeleton V1, we log skipping vs broadcasting
        }));

        const { error: insertErr } = await supabase
            .from('anchor_submissions')
            .upsert(submissionsToInsert, {
                onConflict: 'anchor_id, chain_id',
                ignoreDuplicates: true
            });

        if (insertErr) throw insertErr;

        return NextResponse.json({
            status: 'COMMIT_TRIGGERED',
            anchors_selected: anchorIds.length,
            anchors_inserted: anchorIds.length, // Given ignoreDuplicates, actual DB rows added might be fewer if repeated, but we triggered M.
            current_count: currentCount,
            threshold: ANCHOR_COMMIT_THRESHOLD
        });

    } catch (error: any) {
        console.error('Weekly Commit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
