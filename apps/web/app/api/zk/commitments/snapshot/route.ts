import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Phase 4.2++: ZK Rollup Readiness - Snapshot (SSOT-Parallel)
 * Extracts event_receipts strictly tied to zk_event_registry, mapping
 * exactly to zk_event_receipts using Hard Locked Hashing rules.
 */

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase admin env');
    }
    return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const authHeader = req.headers.get('authorization') || req.headers.get('x-cron-secret');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && authHeader !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: zkFlag } = await supabase
            .from('feature_flags')
            .select('enabled')
            .eq('flag_key', 'ZK_ROUTES_ENABLED')
            .maybeSingle();
        if (zkFlag?.enabled !== true) {
            return NextResponse.json({ error: 'ZK_ROUTES_DISABLED' }, { status: 503 });
        }

        // 1. Fetch enabled registry events
        const { data: registry } = await supabase.from('zk_event_registry').select('*').eq('enabled', true);
        if (!registry || registry.length === 0) return NextResponse.json({ status: 'SKIPPED', message: 'No enabled events.' });

        const enabledEvents = registry.map(r => r.event_type);
        const registryMap = new Map();
        registry.forEach(r => registryMap.set(r.event_type, r));

        // 2. Fetch receipts mapping to enabled events from the last 24h
        // In production, we use a watermark. We query ONLY schema_version >= 3 (meta-enriched).
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: receipts, error: fetchErr } = await supabase
            .from('event_receipts')
            .select('*')
            .in('event_type', enabledEvents)
            .gte('schema_version', 3)
            .gte('occurred_at', twentyFourHoursAgo)
            .order('occurred_at', { ascending: true })
            .limit(100);

        if (fetchErr) {
            console.error('Failed fetching receipts:', fetchErr);
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!receipts || receipts.length === 0) {
            return NextResponse.json({ status: 'SKIPPED', message: 'No new schema_version=3 receipts to commit.' });
        }

        // 3. Deduplicate via source_receipt_id FK
        const receiptIds = receipts.map(r => r.id);
        const { data: existingCommits } = await supabase
            .from('zk_event_receipts')
            .select('source_receipt_id')
            .in('source_receipt_id', receiptIds);

        const existingSet = new Set(existingCommits?.map(c => c.source_receipt_id) || []);

        const newCommitments = [];
        let skippedUnsupported = 0;

        for (const receipt of receipts) {
            if (existingSet.has(receipt.id)) continue;

            // Hard Lock: Only process if Schema Version 3 +
            if (receipt.schema_version < 3) {
                skippedUnsupported++;
                continue;
            }

            let parsedText;
            try { parsedText = JSON.parse(receipt.canonical_text); } catch { continue; }

            // Hard Lock 2: Enforce extraction ONLY from `zk_meta` (PII-free) provided by Node ETL
            const zkMeta = parsedText.zk_meta;
            if (!zkMeta || Object.keys(zkMeta).length === 0) {
                skippedUnsupported++;
                continue;
            }

            const regInfo = registryMap.get(receipt.event_type);
            const userIdKeccak = crypto.createHash('sha3-256').update(receipt.source_id).digest('hex');

            // Reconstruct Public Inputs directly from meta + safe root properties
            // We use keys sorting loosely for stable_stringify simulation
            const public_inputs = {
                user_id_hash: `0x${userIdKeccak}`,
                event_type: receipt.event_type,
                timestamp_bucket: new Date(receipt.occurred_at).getTime() - (new Date(receipt.occurred_at).getTime() % 86400000), // Day bucket
                ...zkMeta
            };

            // Hard Lock 4: Strict Commitment Hashing (Domain Separation)
            const public_inputs_hash_keccak = crypto.createHash('sha3-256').update(JSON.stringify(public_inputs)).digest('hex');

            // Phase 4.2+++ Spec Lock: Schema Version strictly inherited from Registry
            const schema_version = regInfo.public_inputs_schema_version;
            const commitInputStr = `SOULBOUND_COMMIT_V0|${public_inputs_hash_keccak}|${regInfo.circuit_id}|${schema_version}`;
            const commitment_hash = crypto.createHash('sha3-256').update(commitInputStr).digest('hex');

            // Hard Lock 3: Nullifiers only for one-off events
            let nullifier_hash = null;
            if (['UNLOCK_FEE_BURN', 'AIRDROP_CLAIM'].includes(receipt.event_type)) {
                const nullifierStr = `SOULBOUND_NULLIFIER_V0|0x${userIdKeccak}|${receipt.event_type}|${receipt.id}`;
                nullifier_hash = `0x${crypto.createHash('sha3-256').update(nullifierStr).digest('hex')}`;
            }

            newCommitments.push({
                source_receipt_id: receipt.id,
                event_type: receipt.event_type,
                circuit_id: regInfo.circuit_id,
                public_inputs: public_inputs,
                public_inputs_hash_keccak: `0x${public_inputs_hash_keccak}`,
                commitment_scheme: 'KECCAK_PLACEHOLDER_V0', // Spec Lock
                commitment_hash: `0x${commitment_hash}`,
                nullifier_hash: nullifier_hash,
                schema_version: schema_version, // Spec Lock
                occurred_at: receipt.occurred_at
            });
        }

        if (newCommitments.length === 0) {
            return NextResponse.json({
                status: 'SKIPPED',
                message: 'All receipts already committed or unsupported.',
                skipped_unsupported: skippedUnsupported
            });
        }

        // Upsert implicitly handled by UNIQUE constraint on source_receipt_id
        const { error: insertErr } = await supabase
            .from('zk_event_receipts')
            .insert(newCommitments);

        if (insertErr) {
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            status: 'SUCCESS',
            message: `Snapshot completed. Inserted ${newCommitments.length} ZK receipts.`,
            inserted_count: newCommitments.length,
            skipped_unsupported: skippedUnsupported
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
    }
}
