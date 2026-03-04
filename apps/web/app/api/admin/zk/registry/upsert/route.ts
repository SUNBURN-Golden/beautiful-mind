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
        const { event_type, circuit_id, public_inputs_schema_version, enabled } = body;

        if (!event_type || !circuit_id || public_inputs_schema_version === undefined || enabled === undefined) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing required registry fields' }, { status: 400 });
        }

        // 2. Service Role DB Upsert
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey); // pure service role for DB bypass

        // ZK tables are strictly service_role singletons.
        const { error: upsertErr } = await adminSupabase
            .from('zk_event_registry')
            .upsert({
                event_type,
                circuit_id,
                public_inputs_schema_version,
                enabled
            }, { onConflict: 'event_type' });

        if (upsertErr) throw upsertErr;

        // 3. Audit Log
        await adminSupabase.from('audit_logs').insert([{
            table_name: 'zk_event_registry',
            record_id: '00000000-0000-0000-0000-000000000000', // Registry uses text ID, mock UUID for audit standard
            action: 'UPDATE', // General mutation tag
            old_data: {},
            new_data: { event_type, circuit_id, public_inputs_schema_version, enabled, admin_action: 'ADMIN_ZK_REGISTRY_UPSERT' },
            changed_by: user.id
        }]);

        return NextResponse.json({
            status: 'SUCCESS',
            message: `Registry ${event_type} upserted.`,
            data: { event_type, circuit_id, public_inputs_schema_version, enabled }
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
    }
}
