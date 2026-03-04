import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("-> 1. Applying ZK Spec Lock Migration...");
    const sql = fs.readFileSync('../../supabase/migrations/20260225000018_zk_spec_lock_v0.sql', 'utf8');
    const { error: mErr } = await supabase.rpc('apply_patch', { sql_query: sql });
    if (mErr) { console.error("Migration Error:", mErr); return; }

    console.log("-> 2. Checking enabled=true mismatch...");

    const checkSql = `
        SELECT json_agg(t) FROM (
            SELECT r.event_type
            FROM public.zk_event_registry r
            LEFT JOIN (
            SELECT DISTINCT event_type FROM public.event_receipts
            ) e ON e.event_type = r.event_type
            WHERE r.enabled = true AND e.event_type IS NULL
            ORDER BY r.event_type
        ) t;
    `;

    // Fallback directly via PostgREST if RPC is wiped again
    let mismatchData;
    try {
        const { data, error } = await supabase.rpc('apply_patch', { sql_query: checkSql });
        if (error) throw error;
        mismatchData = data ? JSON.parse(data) : [];
    } catch {
        console.log("RPC Error, executing direct select query");
        const { data: registry } = await supabase.from('zk_event_registry').select('event_type').eq('enabled', true);
        const { data: receipts } = await supabase.from('event_receipts').select('event_type');

        const receiptTypes = new Set(receipts?.map(r => r.event_type) || []);
        mismatchData = registry?.filter(r => !receiptTypes.has(r.event_type)).map(r => ({ event_type: r.event_type })) || [];
    }

    console.log("MISMATCH RESULT:");
    console.log(mismatchData);

    if (mismatchData && mismatchData.length > 0) {
        console.log("\n-> Correcting mismatch (setting enabled = false for unanchored events)...");
        const mismatchTypes = mismatchData.map(m => m.event_type);
        const { error: upErr } = await supabase
            .from('zk_event_registry')
            .update({ enabled: false })
            .in('event_type', mismatchTypes);
        if (upErr) console.error("Error updating registry:", upErr);
        else console.log("Mismatch corrected.");
    } else {
        console.log("No mismatches found.");
    }
}

run();
