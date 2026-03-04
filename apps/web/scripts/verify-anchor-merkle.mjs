import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

function buildMerkleRoot(leaves) {
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

async function verifyMerkleRoots() {
    console.log('=== STARTING MERKLE ANCHOR L1-VERIFICATION ===\n');

    // Fetch the latest anchors
    const { data: anchors, error: anchorErr } = await supabase
        .from('merkle_anchors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (anchorErr) {
        console.error('Failed to fetch anchors:', anchorErr);
        process.exit(1);
    }

    if (!anchors || anchors.length === 0) {
        console.log('No anchors found to verify.');
        return;
    }

    let failed = 0;

    for (const anchor of anchors) {
        console.log(`Verifying Anchor ID: ${anchor.id}`);
        console.log(`  Expected Root: ${anchor.merkle_root_keccak}`);
        console.log(`  Items Count:   ${anchor.items_count}`);

        // Fetch receipts for this batch securely, matching the deterministic sorting from the pipeline
        const { data: receipts, error: receiptErr } = await supabase
            .from('event_receipts')
            .select('source_id, receipt_hash_keccak, occurred_at')
            .gte('occurred_at', anchor.batch_start)
            .lte('occurred_at', anchor.batch_end)
            // Note: Supabase JS order by strings for localeCompare equivalent sorting might differ, so we sort locally strictly
            .order('occurred_at', { ascending: true });

        if (receiptErr) {
            console.error('Failed to fetch receipts:', receiptErr);
            process.exit(1);
        }

        if (!receipts || receipts.length === 0) {
            if (anchor.items_count === 0 && anchor.merkle_root_keccak === ethers.keccak256(ethers.toUtf8Bytes(''))) {
                console.log(`  Result: PASS (Empty Batch)`);
                continue;
            }
            console.error('  CRITICAL ERROR: No event receipts found for this anchor time range!');
            failed++;
            continue;
        }

        // Identical exact sort rule: occurred_at ASC -> source_id ASC (localeCompare fallback via Javascript)
        receipts.sort((a, b) => {
            if (a.occurred_at === b.occurred_at) {
                return a.source_id.localeCompare(b.source_id);
            }
            // Timestamp is ISO string
            return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
        });

        const receiptHashes = receipts.map((r) => r.receipt_hash_keccak);

        if (receiptHashes.length !== anchor.items_count) {
            console.error(`  CRITICAL ERROR: Receipt count mismatch! Expected ${anchor.items_count}, got ${receiptHashes.length}`);
            failed++;
            continue;
        }

        const calculatedRoot = buildMerkleRoot(receiptHashes);

        if (calculatedRoot === anchor.merkle_root_keccak) {
            console.log(`  Calculated Root: ${calculatedRoot}`);
            console.log('  Result: PASS VERIFICATION ✅\n');
        } else {
            console.error(`  Calculated Root: ${calculatedRoot}`);
            console.error('  Result: FAILED ❌ (ROOT MISMATCH)\n');
            failed++;
        }
    }

    if (failed > 0) {
        console.error(`\nverification FAILED on ${failed} anchors. Please do not commit to L1.`);
        process.exit(1);
    } else {
        console.log(`\nAll ${anchors.length} fetched anchors have been successfully cryptographically verified!`);
    }
}

verifyMerkleRoots().catch(console.error);
