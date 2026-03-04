import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Allowed public inputs strictly stripping PII
const PII_FREE_KEYS = ['code', 'tier_result', 'band_result', 'hash', 'amount', 'time_bucket', 'verification_type', 'status', 'verification_consistency', 'stage'];

function extractPiiFreeInputs(canonicalJson) {
    const inputs = {};
    for (const key of PII_FREE_KEYS) {
        if (canonicalJson[key] !== undefined) {
            inputs[key] = canonicalJson[key];
        } else if (canonicalJson.meta && canonicalJson.meta[key] !== undefined) {
            inputs[key] = canonicalJson.meta[key];
        }
    }
    return inputs;
}

async function runEtlMirror() {
    console.log("🚀 Starting ZK ETL Mirror Writer (Single Run)...\\n");

    try {
        // 1. Load Registry Allowlist
        const { data: registry, error: regErr } = await supabase
            .from('zk_event_registry')
            .select('*')
            .eq('enabled', true);

        if (regErr) {
            console.warn("Could not load registry via REST, proceeding with hardcoded allowlist for ETL test due to cache.", regErr.message);
        }

        const allowlist = {};
        if (registry) {
            registry.forEach(r => allowlist[r.event_type] = r);
        } else {
            // Fallback for broken local Supabase schema cache
            allowlist['VERIFICATIONS_INSERT'] = { circuit_id: 'QUALIFICATION_V0', public_inputs_schema_version: 1 };
            allowlist['TOKEN_LEDGER_INSERT'] = { circuit_id: 'FRAUD_V0', public_inputs_schema_version: 1 };
        }

        const allowedEventTypes = Object.keys(allowlist);
        if (allowedEventTypes.length === 0) {
            console.log("No enabled event types in registry. Exiting.");
            return;
        }

        // 2. Fetch Pending/All Event Receipts
        const { data: receipts, error: recErr } = await supabase
            .from('event_receipts')
            .select('id, event_type, canonical_json, occurred_at')
            .in('event_type', allowedEventTypes)
            .order('occurred_at', { ascending: true })
            .limit(10); // Batch size

        if (recErr) throw recErr;

        // Fetch existing mapped IDs to determine insert vs skip (idempotency simulation if UPSERT fails quietly)
        const receiptIds = receipts.map(r => r.id);
        const { data: existingZk } = await supabase
            .from('zk_event_receipts')
            .select('source_receipt_id')
            .in('source_receipt_id', receiptIds);

        const existingSet = new Set((existingZk || []).map(z => z.source_receipt_id));

        let insertedCount = 0;
        let skippedCount = 0;
        let alreadyDoneCount = 0;

        for (const receipt of receipts) {
            const regInfo = allowlist[receipt.event_type];
            if (!regInfo) {
                skippedCount++;
                continue;
            }

            if (existingSet.has(receipt.id)) {
                alreadyDoneCount++;
                continue;
            }

            // 3. Extract PII-free inputs
            const public_inputs = extractPiiFreeInputs(receipt.canonical_json);

            // 4. Stable stringify & Keccak hash
            const canonStr = Object.keys(public_inputs).sort().map(k => `${k}:${public_inputs[k]}`).join('|');
            const public_inputs_hash_keccak = `0x${crypto.createHash('sha3-256').update(canonStr || 'empty').digest('hex')}`;

            const schema_version = regInfo.public_inputs_schema_version;

            // 5. Commitment scheme configuration
            const commitment_scheme = 'KECCAK_PLACEHOLDER_V0';
            const commitInputStr = `SOULBOUND_COMMIT_V0|${public_inputs_hash_keccak}|${regInfo.circuit_id}|${schema_version}`;
            const commitment_hash = `0x${crypto.createHash('sha3-256').update(commitInputStr).digest('hex')}`;

            // Optional nullifier
            let nullifier_hash = null;
            if (['UNLOCK_FEE_BURN', 'AIRDROP_CLAIM'].includes(receipt.event_type)) {
                const nullifierStr = `SOULBOUND_NULLIFIER_V0|${receipt.event_type}|${receipt.id}`;
                nullifier_hash = `0x${crypto.createHash('sha3-256').update(nullifierStr).digest('hex')}`;
            }

            // 6. Idempotent Upsert into zk_event_receipts
            const zkPayload = {
                source_receipt_id: receipt.id,
                event_type: receipt.event_type,
                circuit_id: regInfo.circuit_id,
                public_inputs: public_inputs,
                public_inputs_hash_keccak,
                commitment_scheme,
                commitment_hash,
                nullifier_hash,
                schema_version,
                occurred_at: receipt.occurred_at
            };

            const { error: upsertErr } = await supabase
                .from('zk_event_receipts')
                .upsert(zkPayload, { onConflict: 'source_receipt_id' });

            if (upsertErr) {
                console.error(`Failed to upsert receipt ${receipt.id}:`, upsertErr.message);
                skippedCount++;
            } else {
                insertedCount++;
            }
        }

        // 7. Log output
        console.log(`[ETL Run Complete]`);
        console.log(`inserted_count: ${insertedCount}`);
        console.log(`already_done_count: ${alreadyDoneCount}`);
        console.log(`skipped_count: ${skippedCount}\\n`);

    } catch (err) {
        console.error("ETL Script Execution Error:", err);
    }
}

runEtlMirror();
