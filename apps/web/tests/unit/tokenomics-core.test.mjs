import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTreasurySpendStatusToHttp, resolveAirdropTier } from '../../lib/server/tokenomics-core.js';

test('resolveAirdropTier applies expected anti-farming tier boundaries', () => {
    assert.deepEqual(resolveAirdropTier(1), { cohort: 'TOP100', amount: 80 });
    assert.deepEqual(resolveAirdropTier(100), { cohort: 'TOP100', amount: 80 });
    assert.deepEqual(resolveAirdropTier(101), { cohort: 'TOP1000', amount: 50 });
    assert.deepEqual(resolveAirdropTier(1000), { cohort: 'TOP1000', amount: 50 });
    assert.deepEqual(resolveAirdropTier(1001), { cohort: 'BASE', amount: 20 });
});

test('resolveAirdropTier falls back safely for invalid claim numbers', () => {
    assert.deepEqual(resolveAirdropTier(0), { cohort: 'BASE', amount: 20 });
    assert.deepEqual(resolveAirdropTier(-5), { cohort: 'BASE', amount: 20 });
    assert.deepEqual(resolveAirdropTier(Number.NaN), { cohort: 'BASE', amount: 20 });
});

test('mapTreasurySpendStatusToHttp returns stable API contract codes', () => {
    assert.equal(mapTreasurySpendStatusToHttp('SPENT'), 200);
    assert.equal(mapTreasurySpendStatusToHttp('IDEMPOTENT_SKIPPED'), 200);
    assert.equal(mapTreasurySpendStatusToHttp('BUDGET_NOT_FOUND'), 409);
    assert.equal(mapTreasurySpendStatusToHttp('BUDGET_EXCEEDED'), 409);
    assert.equal(mapTreasurySpendStatusToHttp('BAD_REQUEST'), 400);
    assert.equal(mapTreasurySpendStatusToHttp('UNKNOWN'), 400);
});

