import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient(req: Request) {
    const authHeader = req.headers.get('Authorization');
    return createClient(supabaseUrl, serviceRoleKey, {
        global: { headers: { Authorization: authHeader || '' } }
    });
}

export async function POST(req: Request) {
    try {
        const supabase = getAdminClient(req);

        // 1. Auth & is_admin Check
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED', message: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
        }

        // 2. Prepare Rollup Batch Logic
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

        // Find unprocessed receipts to batch
        const { data: receipts, error: recErr } = await adminSupabase
            .from('zk_event_receipts')
            .select('id, occurred_at')
            .order('occurred_at', { ascending: true })
            .limit(50); // Batch size limit

        if (recErr) throw recErr;

        let message = "No unbatched receipts found.";
        let batchId = null;

        if (receipts && receipts.length > 0) {
            const batchStart = receipts[0].occurred_at;
            const batchEnd = receipts[receipts.length - 1].occurred_at;

            // Generate a slot
            const { data: batch, error: batchErr } = await adminSupabase
                .from('zk_rollup_batches')
                .insert([{
                    batch_start: batchStart,
                    batch_end: batchEnd,
                    items_count: receipts.length,
                    commitment_scheme: 'KECCAK_PLACEHOLDER_V0',
                    status: 'READY'
                }])
                .select()
                .single();

            if (batchErr) throw batchErr;
            batchId = batch.id;
            message = `Prepared batch ${batch.id} with ${receipts.length} items.`;
        }

        // 3. Audit Log
        await adminSupabase.from('audit_logs').insert([{
            table_name: 'zk_rollup_batches',
            record_id: batchId || '00000000-0000-0000-0000-000000000000',
            action: 'INSERT',
            old_data: {},
            new_data: { items_count: receipts?.length || 0, admin_action: 'ADMIN_ZK_ROLLUP_PREPARE' },
            changed_by: user.id
        }]);

        return NextResponse.json({
            admin_status: 'SUCCESS',
            message,
            batch_id: batchId
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'INTERNAL_SERVER_ERROR';
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
    }
}
