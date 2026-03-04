import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Phase 4.2++: ZK Rollup Readiness - Prepare Batch SSOT-Parallel
 * Aggregates loose zk_event_receipts based on strict occurred_at sorting
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization') || req.headers.get('x-cron-secret');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && authHeader !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Hard Lock 1: Stable Sorting mechanism using occurred_at ASC + source_receipt_id ASC
        // We only fetch items that DO NOT currently map to a Batch in a real prod environment.
        // For skeletal design, we take the latest 10 unbatched. In a final release zk_event_receipts needs a batch_id FK.
        const { data: commitments, error: fetchErr } = await supabase
            .from('zk_event_receipts')
            .select('*')
            .order('occurred_at', { ascending: true })
            .order('source_receipt_id', { ascending: true })
            .limit(10);

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!commitments || commitments.length === 0) {
            return NextResponse.json({ status: 'SKIPPED', message: 'No un-batched commitments found.' });
        }

        // Root calculation Placeholder
        const concatHashes = commitments.map(c => c.commitment_hash).join('');
        const rootHash = crypto.createHash('sha3-256').update(concatHashes).digest('hex');

        // Extract boundaries
        const batchStart = commitments[0].occurred_at;
        const batchEnd = commitments[commitments.length - 1].occurred_at;

        const newBatch = {
            batch_start: batchStart,
            batch_end: batchEnd,
            items_count: commitments.length,
            root_hash: `0x${rootHash}`,
            commitment_scheme: 'KECCAK_PLACEHOLDER_V0',
            schema_version: 1,
            status: 'READY'
        };

        const { data: insertedBatch, error: batchErr } = await supabase
            .from('zk_rollup_batches')
            .insert(newBatch)
            .select('*')
            .single();

        if (batchErr || !insertedBatch) {
            return NextResponse.json({ error: batchErr?.message || 'Failed inserting batch' }, { status: 500 });
        }

        return NextResponse.json({
            status: 'SUCCESS',
            message: `Prepared ZK Rollup Batch payload containing ${commitments.length} commitments.`,
            batch_id: insertedBatch.id,
            root_hash: insertedBatch.root_hash,
            ready: true
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
