import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

// Initialize Supabase client bypassing RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// P0-1: Deep Stable Stringify (Deterministic Hashing)
function deepStableStringify(obj: any): string {
    if (obj === null || obj === undefined) {
        return JSON.stringify(null);
    }
    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(item => deepStableStringify(item)).join(',')}]`;
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: string[] = [];
    for (const key of sortedKeys) {
        result.push(`"${key}":${deepStableStringify(obj[key])}`);
    }
    return `{${result.join(',')}}`;
}

// P0-2: Privacy Filter (Metadata + Hash Allowlist only)
const SENSITIVE_KEYS = [
    'user_raw_text', 'review_contents',
    'admin_note', 'adjudication_reason', 'artifact_object_key',
    'artifact_expires_at', 'phone_encrypted', 'identity_verification_id',
    'image_urls', 'file_path'
];

function stripSensitiveData(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripSensitiveData);

    const clone = { ...obj };
    for (const key of SENSITIVE_KEYS) {
        if (key in clone) {
            delete clone[key];
        }
    }
    for (const key in clone) {
        clone[key] = stripSensitiveData(clone[key]);
    }
    return clone;
}

function computePayloadHash(data: any): string | null {
    if (!data || typeof data !== 'object') return null;
    const sanitizedData = stripSensitiveData(data);
    const stableString = deepStableStringify(sanitizedData);
    return ethers.keccak256(ethers.toUtf8Bytes(stableString));
}

function determineEventType(log: any, newData: any): string {
    if (log.table_name === 'token_ledger' && log.action === 'INSERT') {
        const idempotency = newData?.idempotency_key || '';

        // --- Event Type ETL Normalization Rules ---
        // To maintain unified enums (soul_tx_type) at the DB level but guarantee 
        // high-resolution observability on-chain, event_receipts remap their `event_type` 
        // based on strict strict prefix matching inside the idempotency_key.

        if (newData.type === 'GAS_FEE_BURN') {
            if (idempotency.startsWith('UNLOCK_FEE_')) return 'UNLOCK_FEE_BURN';
            return 'GAS_FEE_BURN';
        }
        if (newData.type === 'SLASHING_BURN') {
            if (idempotency.startsWith('SLASH_FRAUD_')) return 'SLASH_FRAUD_BURN';
            return 'SLASHING_BURN';
        }
        if (newData.type === 'INSURANCE_CREDIT') {
            if (idempotency.startsWith('INSURANCE_CREDIT_FRAUD_')) return 'INSURANCE_FRAUD_CREDIT';
            return 'INSURANCE_CREDIT';
        }
    }
    return `${log.table_name.toUpperCase()}_${log.action.toUpperCase()}`;
}

export async function POST(req: Request) {
    try {
        // P0-4: Endpoint Access Control
        const authHeader = req.headers.get('x-cron-secret');
        if (authHeader !== CRON_SECRET) {
            console.error('Unauthorized merkle-snapshot invocation attempt.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // P0-5: Incremental Processing
        // Fetch the absolute latest anchor to find the last processed audit_id watermark
        let lastAuditId = null;
        const { data: latestAnchor, error: latestErr } = await supabase
            .from('merkle_anchors')
            .select('last_audit_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (latestErr && latestErr.code !== 'PGRST116') { // Ignore "no rows returned" error on first run
            throw latestErr;
        }

        if (latestAnchor && latestAnchor.last_audit_id) {
            lastAuditId = latestAnchor.last_audit_id;
        }

        let logsQuery = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: true })
            .order('id', { ascending: true });

        let { data: rawLogs, error: logsError } = await logsQuery;
        if (logsError) throw logsError;

        let pendingLogs = rawLogs || [];

        // P0-5 Absolute Incremental Slicing
        // Since UUIDs are not strictly comparable with >, we slice the array after we find the last processed ID
        // Production note: For millions of rows, use a sequential BigInt ID or Time-based cursor.
        if (lastAuditId) {
            const lastProcessedIndex = pendingLogs.findIndex((l: any) => l.id === lastAuditId);
            if (lastProcessedIndex !== -1) {
                pendingLogs = pendingLogs.slice(lastProcessedIndex + 1);
            } else {
                // Failsafe Deduplication if the exact UUID was not in the most recent batch limit
                const { data: existingReceipts, error: recError } = await supabase
                    .from('event_receipts')
                    .select('source_id');
                if (recError) throw recError;
                const processedIds = new Set(existingReceipts.map(r => r.source_id));
                pendingLogs = pendingLogs.filter((l: any) => !processedIds.has(l.id));
            }
        } else {
            // Very first run: we still ensure we don't process already processed ones.
            const { data: existingReceipts, error: recError } = await supabase
                .from('event_receipts')
                .select('source_id');
            if (recError) throw recError;
            const processedIds = new Set(existingReceipts.map(r => r.source_id));
            pendingLogs = pendingLogs.filter((l: any) => !processedIds.has(l.id));
        }

        if (pendingLogs.length === 0) {
            return NextResponse.json({ success: true, message: 'No new audit logs to anchor.', count: 0 });
        }

        const receiptsToInsert = [];
        let receiptHashes = [];
        const batchStart = pendingLogs[0].created_at;
        const batchEnd = pendingLogs[pendingLogs.length - 1].created_at;
        const watermarkId = pendingLogs[pendingLogs.length - 1].id;

        // Helper for binary tree construction
        function buildMerkleRoot(leaves: string[]) {
            if (leaves.length === 0) return ethers.keccak256(ethers.toUtf8Bytes(''));
            let layer = [...leaves];
            while (layer.length > 1) {
                let nextLayer = [];
                for (let i = 0; i < layer.length; i += 2) {
                    if (i + 1 === layer.length) {
                        nextLayer.push(layer[i]);
                    } else {
                        const a = layer[i].startsWith('0x') ? layer[i].substring(2) : layer[i];
                        const b = layer[i + 1].startsWith('0x') ? layer[i + 1].substring(2) : layer[i + 1];
                        nextLayer.push(ethers.keccak256('0x' + a + b));
                    }
                }
                layer = nextLayer;
            }
            return layer[0];
        }

        for (const log of pendingLogs) {
            // P0-2: Erase ALL raw data, compute payload hashes only
            const newHash = computePayloadHash(log.new_data);
            const oldHash = computePayloadHash(log.old_data);

            const eventType = determineEventType(log, log.new_data);

            let meta: any = {};
            if (log.table_name === 'token_ledger' && log.new_data) {
                meta.type = log.new_data.type;
                meta.amount = log.new_data.amount;
                meta.idempotency_key = log.new_data.idempotency_key;
            }

            const canonicalJson = {
                action: log.action,
                audit_id: log.id,
                event_type: eventType,
                meta: meta,
                new_hash: newHash,
                old_hash: oldHash,
                record: log.record_id,
                schema_version: 2,
                table: log.table_name,
                timestamp: log.created_at,
                user: log.changed_by
            };

            // P0-1: Deterministic Hashing
            const canonicalText = deepStableStringify(canonicalJson);
            const receiptHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalText));

            receiptsToInsert.push({
                source_table: log.table_name,
                source_id: log.id,
                action: log.action,
                occurred_at: log.created_at,
                event_type: eventType,
                canonical_json: canonicalJson,
                canonical_text: canonicalText,
                receipt_hash_keccak: receiptHash,
                schema_version: 2
            });
        }

        // Leaves sort rule: occurred_at ASC, source_id ASC
        receiptsToInsert.sort((a, b) => {
            if (a.occurred_at === b.occurred_at) {
                return a.source_id.localeCompare(b.source_id);
            }
            return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
        });

        receiptHashes = receiptsToInsert.map(r => r.receipt_hash_keccak);
        const merkleRoot = buildMerkleRoot(receiptHashes);

        // P0-3: Concurrency UPSERT - Ignore if UNIQUE(source_table, source_id) already exists 
        const { error: insertReceiptsErr } = await supabase
            .from('event_receipts')
            .upsert(receiptsToInsert, {
                onConflict: 'source_table, source_id',
                ignoreDuplicates: true
            });

        if (insertReceiptsErr) throw insertReceiptsErr;

        // P0-3: Concurrency UPSERT - Ignore if UNIQUE(source, batch_end, schema_version) overlaps
        const { error: anchorErr } = await supabase
            .from('merkle_anchors')
            .upsert([{
                source: 'audit_logs',
                batch_start: batchStart,
                batch_end: batchEnd,
                items_count: receiptsToInsert.length,
                merkle_root_keccak: merkleRoot,
                schema_version: 1,
                last_audit_id: watermarkId
            }], {
                onConflict: 'source, batch_end, schema_version',
                ignoreDuplicates: true
            });

        if (anchorErr) throw anchorErr;

        return NextResponse.json({
            success: true,
            anchored_items: receiptsToInsert.length,
            merkle_root: merkleRoot,
            watermark: watermarkId
        });

    } catch (error: any) {
        console.error('Merkle Snapshot Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
