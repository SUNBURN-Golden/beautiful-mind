import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

function read(filePath) {
    return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

test('airdrop/treasury routes use canonical SOUL mutation services', () => {
    const airdropRoute = read('app/api/airdrop/claim/route.ts');
    const treasuryRoute = read('app/api/treasury/spend/route.ts');

    assert.match(airdropRoute, /claimSoulAirdrop/);
    assert.doesNotMatch(airdropRoute, /from\('token_ledger'\)\.insert\(/);

    assert.match(treasuryRoute, /spendTreasuryWithBudget/);
    assert.doesNotMatch(treasuryRoute, /from\('token_ledger'\)\.insert\(/);
});

test('review routes no longer bypass SOUL writes with direct token_ledger insert', () => {
    const unlockRoute = read('app/api/review/unlock/route.ts');
    const sweepRoute = read('app/api/admin/review/sweep/route.ts');
    const unlockService = read('lib/server/review-unlock-service.ts');
    const sweepService = read('lib/server/admin-review-sweep.ts');

    assert.match(unlockRoute, /unlockReviewSession/);
    assert.doesNotMatch(unlockRoute, /from\('token_ledger'\)\.insert\(/);
    assert.match(unlockService, /appendSoulLedgerInternal/);
    assert.doesNotMatch(unlockService, /from\('token_ledger'\)\.insert\(/);

    assert.match(sweepRoute, /runAdminReviewSweep/);
    assert.doesNotMatch(sweepRoute, /from\('token_ledger'\)\.insert\(/);
    assert.match(sweepService, /appendSoulLedgerInternal/);
    assert.doesNotMatch(sweepService, /from\('token_ledger'\)\.insert\(/);
});

test('simulation scripts avoid direct token_ledger / soul_airdrop_claims table mutation', () => {
    const simulateAirdrop = read('scripts/simulate-airdrop.mjs');
    const simulateGasFee = read('scripts/simulate-gas-fee.mjs');
    const simulateHolds = read('scripts/simulate-holds.mjs');
    const simulateIdempotency = read('scripts/simulate-idempotency.mjs');

    assert.match(simulateAirdrop, /rpc\('claim_soul_airdrop'/);
    assert.doesNotMatch(simulateAirdrop, /from\('token_ledger'\)\.insert\(/);
    assert.doesNotMatch(simulateAirdrop, /from\('soul_airdrop_claims'\)\.(insert|update|upsert|delete)\(/);

    assert.match(simulateGasFee, /rpc\('append_soul_ledger_internal'/);
    assert.doesNotMatch(simulateGasFee, /from\('token_ledger'\)\.insert\(/);

    assert.match(simulateHolds, /rpc\('treasury_spend_with_budget'/);
    assert.match(simulateHolds, /rpc\('append_soul_ledger_internal'/);
    assert.doesNotMatch(simulateHolds, /from\('token_ledger'\)\.insert\(/);

    assert.match(simulateIdempotency, /rpc\('append_soul_ledger_internal'/);
    assert.doesNotMatch(simulateIdempotency, /from\('token_ledger'\)\.insert\(/);
});

test('hardening migration enforces projection and reconciliation primitives', () => {
    const migration = read('../../supabase/migrations/20260309130000_soul_write_hardening.sql');

    assert.match(migration, /REVOKE INSERT ON TABLE public\.token_ledger FROM service_role/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.append_soul_ledger_internal/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.guard_user_wallets_projection_write/);
    assert.match(migration, /CREATE OR REPLACE VIEW public\.user_wallet_balance_audit/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.reconcile_user_wallet_balance/);
});

test('official/internal write paths retain idempotency contracts', () => {
    const tokenomicsMigration = read('../../supabase/migrations/20260305000000_tokenomics_hardening.sql');
    const writeHardeningMigration = read('../../supabase/migrations/20260309130000_soul_write_hardening.sql');

    assert.match(tokenomicsMigration, /CREATE OR REPLACE FUNCTION public\.treasury_spend_with_budget/);
    assert.match(tokenomicsMigration, /CREATE OR REPLACE FUNCTION public\.claim_soul_airdrop/);
    assert.match(tokenomicsMigration, /EXCEPTION WHEN unique_violation/);
    assert.match(tokenomicsMigration, /'status', 'IDEMPOTENT_SKIPPED'/);
    assert.match(tokenomicsMigration, /WHERE idempotency_key = v_idem/);

    assert.match(writeHardeningMigration, /CREATE OR REPLACE FUNCTION public\.append_soul_ledger_internal/);
    assert.match(writeHardeningMigration, /EXCEPTION WHEN unique_violation/);
    assert.match(writeHardeningMigration, /'status', 'IDEMPOTENT_SKIPPED'/);
});

test('wallet consistency audit/reconcile contract is ledger-primary', () => {
    const migration = read('../../supabase/migrations/20260309130000_soul_write_hardening.sql');

    assert.match(migration, /CREATE OR REPLACE VIEW public\.user_wallet_balance_audit/);
    assert.match(migration, /FULL OUTER JOIN wallet_rows w USING \(user_id\)/);
    assert.match(migration, /COALESCE\(w\.wallet_balance, 0\) - COALESCE\(l\.ledger_sum, 0\)/);
    assert.match(migration, /'mode', 'DRY_RUN'/);
    assert.match(migration, /'mode', 'APPLY'/);
    assert.match(migration, /set_config\('app\.user_wallets_write_source', 'RECONCILE'/);
    assert.match(migration, /balance = EXCLUDED\.balance/);
});
