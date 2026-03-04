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

        // 1. Production Hard Block (Critical)
        if (process.env.NODE_ENV === 'production') {
            const warningMsg = 'Forbidden: Cannot reset ZK state in Production environment.';
            console.error(warningMsg);
            return NextResponse.json({ error: 'FORBIDDEN', message: warningMsg }, { status: 403 });
        }

        // 2. Auth & is_admin Check
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

        // 3. Backdoor Secret and Flag Checks
        const devSecret = req.headers.get('x-dev-secret');
        if (devSecret !== process.env.DEV_BACKDOOR_SECRET) {
            return NextResponse.json({ error: 'UNAUTHORIZED_BACKDOOR', message: 'Invalid backdoor secret' }, { status: 401 });
        }

        if (process.env.ALLOW_DANGEROUS_BACKDOOR !== 'true') {
            return NextResponse.json({ error: 'DANGEROUS_BACKDOOR_LOCKED', message: 'Dangerous backdoor flag is strictly off' }, { status: 403 });
        }

        // 4. Service Role Raw Truncate
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

        // As standard Supabase SDK doesn't natively support TRUNCATE, we use RPC
        const resetSql = `
            TRUNCATE TABLE public.zk_proofs CASCADE;
            TRUNCATE TABLE public.zk_commitments CASCADE;
            TRUNCATE TABLE public.zk_nullifiers CASCADE;
            TRUNCATE TABLE public.zk_rollup_submissions CASCADE;
            TRUNCATE TABLE public.zk_rollup_batches CASCADE;
            TRUNCATE TABLE public.zk_event_receipts CASCADE;
        `;

        const { error: resetErr } = await adminSupabase.rpc('apply_patch', { sql_query: resetSql });

        // 5. Audit Log (always log, even on fallback failure attempt)
        await adminSupabase.from('audit_logs').insert([{
            table_name: 'zk_event_receipts', // Representing bulk wipe
            record_id: '00000000-0000-0000-0000-000000000000',
            action: 'DELETE',
            old_data: {},
            new_data: {
                environment: process.env.NODE_ENV,
                tables_wiped: ['zk_proofs', 'zk_commitments', 'zk_nullifiers', 'zk_rollup_submissions', 'zk_rollup_batches', 'zk_event_receipts'],
                admin_action: 'ADMIN_ZK_RESET_ALL'
            },
            changed_by: user.id
        }]);

        if (resetErr) {
            return NextResponse.json({ error: 'RESET_FAILED', message: resetErr.message }, { status: 500 });
        }

        return NextResponse.json({
            admin_status: 'SUCCESS',
            message: 'All ZK mirror tables successfully truncated. SSOT remains intact.'
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'INTERNAL_SERVER_ERROR';
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
    }
}
