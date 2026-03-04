import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient(req: Request) {
    const authHeader = req.headers.get('Authorization');
    return createClient(supabaseUrl, serviceRoleKey, {
        global: { headers: { Authorization: authHeader || '' } }
    });
}

const ALLOWED_PUBLIC_INPUT_KEYS = [
    'verification_type', 'status', 'tier_result', 'band_result',
    'adjudication_reason', 'amount', 'vault', 'reason',
    'verification_consistency', 'stage'
];

function extractPiiFreeInputs(canonicalJson: any) {
    const inputs: any = {};
    for (const key of ALLOWED_PUBLIC_INPUT_KEYS) {
        if (canonicalJson[key] !== undefined) {
            inputs[key] = canonicalJson[key];
        } else if (canonicalJson.meta && canonicalJson.meta[key] !== undefined) {
            inputs[key] = canonicalJson.meta[key];
        }
    }
    return inputs;
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

        // 2. Fetch Allowlist
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: registry, error: regErr } = await adminSupabase.from('zk_event_registry').select('*');
        if (regErr) throw regErr;

        const allowlist: Record<string, any> = {};
        registry.forEach(r => allowlist[r.event_type] = r);

        // 3. Process Event Receipts Snapshot (Simulates ETL Writer execution as an operator trigger)
        const { data: receipts, error: recErr } = await adminSupabase
            .from('event_receipts')
            .select('*')
            .order('occurred_at', { ascending: false })
            .limit(100);

        if (recErr) throw recErr;

        let inserted = 0;
        let skipped = 0;

        for (const receipt of receipts) {
            const regInfo = allowlist[receipt.event_type];
            if (!regInfo || !regInfo.enabled) {
                skipped++;
                continue;
            }

            const public_inputs = extractPiiFreeInputs(receipt.canonical_json);
            const canonStr = Object.keys(public_inputs).sort().map(k => `${k}:${public_inputs[k]}`).join('|');
            const public_inputs_hash_keccak = crypto.createHash('sha3-256').update(canonStr).digest('hex');

            const schema_version = regInfo.public_inputs_schema_version;
            const commitInputStr = `SOULBOUND_COMMIT_V0|${public_inputs_hash_keccak}|${regInfo.circuit_id}|${schema_version}`;
            const commitment_hash = crypto.createHash('sha3-256').update(commitInputStr).digest('hex');

            let nullifier_hash = null;
            if (['UNLOCK_FEE_BURN', 'AIRDROP_CLAIM'].includes(receipt.event_type)) {
                const nullifierStr = `SOULBOUND_NULLIFIER_V0|${receipt.event_type}|${receipt.id}`;
                nullifier_hash = `0x${crypto.createHash('sha3-256').update(nullifierStr).digest('hex')}`;
            }

            const zkPayload = {
                source_receipt_id: receipt.id,
                event_type: receipt.event_type,
                circuit_id: regInfo.circuit_id,
                public_inputs: public_inputs,
                public_inputs_hash_keccak: `0x${public_inputs_hash_keccak}`,
                commitment_scheme: 'KECCAK_PLACEHOLDER_V0',
                commitment_hash: `0x${commitment_hash}`,
                nullifier_hash: nullifier_hash,
                schema_version: schema_version,
                occurred_at: receipt.occurred_at
            };

            const { error: upsertErr } = await adminSupabase
                .from('zk_event_receipts')
                .upsert(zkPayload, { onConflict: 'source_receipt_id' });

            if (!upsertErr) inserted++;
        }

        // 4. Audit Log
        const resultPayload = { status: 'SUCCESS', inserted_count: inserted, skipped_unsupported: skipped, admin_action: 'ADMIN_ZK_SNAPSHOT_RUN' };
        await adminSupabase.from('audit_logs').insert([{
            table_name: 'zk_event_receipts',
            record_id: '00000000-0000-0000-0000-000000000000',
            action: 'INSERT',
            old_data: {},
            new_data: resultPayload,
            changed_by: user.id
        }]);

        return NextResponse.json({
            admin_status: 'SUCCESS',
            pipeline_result: { message: `Snapshot completed. Inserted ${inserted} ZK receipts.`, ...resultPayload }
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
    }
}
