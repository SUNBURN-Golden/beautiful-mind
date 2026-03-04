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

        const body = await req.json();
        const { event_type, enabled } = body;

        if (!event_type || enabled === undefined) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing event_type or enabled boolean' }, { status: 400 });
        }

        // 2. Service Role DB Update
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

        const { error: updateErr } = await adminSupabase
            .from('zk_event_registry')
            .update({ enabled })
            .eq('event_type', event_type);

        if (updateErr) throw updateErr;

        // 3. Audit Log
        await adminSupabase.from('audit_logs').insert([{
            table_name: 'zk_event_registry',
            record_id: '00000000-0000-0000-0000-000000000000',
            action: 'UPDATE',
            old_data: {},
            new_data: { event_type, enabled, admin_action: 'ADMIN_ZK_REGISTRY_TOGGLE' },
            changed_by: user.id
        }]);

        return NextResponse.json({
            status: 'SUCCESS',
            message: `Registry ${event_type} enabled toggled to ${enabled}.`,
            data: { event_type, enabled }
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'INTERNAL_SERVER_ERROR';
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
    }
}
