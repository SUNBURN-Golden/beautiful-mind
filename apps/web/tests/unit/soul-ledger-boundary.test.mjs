import test from 'node:test';
import assert from 'node:assert/strict';

const {
    SOUL_LEDGER_RPC,
    buildClaimSoulAirdropRpcPayload,
    buildSpendTreasuryWithBudgetRpcPayload,
    buildAppendSoulLedgerInternalRpcPayload,
    claimSoulAirdrop,
    spendTreasuryWithBudget,
    appendSoulLedgerInternal,
} = await import('../../lib/server/soul-ledger.ts');

test('payload builders normalize optional SOUL RPC params', () => {
    assert.deepEqual(
        buildClaimSoulAirdropRpcPayload({ userId: 'user-1' }),
        {
            p_user_id: 'user-1',
            p_idempotency_key: null,
        }
    );

    assert.deepEqual(
        buildSpendTreasuryWithBudgetRpcPayload({
            vault: 'OPS',
            amount: 25,
        }),
        {
            p_vault: 'OPS',
            p_amount: 25,
            p_related_id: null,
            p_idempotency_key: null,
            p_meta: {},
        }
    );

    assert.deepEqual(
        buildAppendSoulLedgerInternalRpcPayload({
            userId: 'user-2',
            amount: -5,
            type: 'GAS_FEE_BURN',
            relatedId: 'session-1',
            idempotencyKey: 'idem-1',
            meta: { scope: 'UNIT_TEST' },
        }),
        {
            p_user_id: 'user-2',
            p_amount: -5,
            p_type: 'GAS_FEE_BURN',
            p_related_id: 'session-1',
            p_idempotency_key: 'idem-1',
            p_meta: { scope: 'UNIT_TEST' },
        }
    );
});

test('claim wrapper uses canonical rpc name and payload contract', async () => {
    const calls = [];
    const admin = {
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            return {
                data: { status: 'CLAIMED', claim_no: 1, amount: 100 },
                error: null,
            };
        },
    };

    const result = await claimSoulAirdrop(admin, {
        userId: 'user-3',
        idempotencyKey: 'airdrop-1',
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, SOUL_LEDGER_RPC.CLAIM_AIRDROP);
    assert.deepEqual(calls[0].payload, {
        p_user_id: 'user-3',
        p_idempotency_key: 'airdrop-1',
    });
    assert.equal(result.status, 'CLAIMED');
    assert.equal(result.claim_no, 1);
    assert.equal(result.amount, 100);
});

test('wrapper contract stays object-shaped when rpc returns nullish/non-object data', async () => {
    const adminNull = {
        rpc: async () => ({ data: null, error: null }),
    };

    const adminArray = {
        rpc: async () => ({ data: ['unexpected'], error: null }),
    };

    const claimResult = await claimSoulAirdrop(adminNull, { userId: 'user-4' });
    const treasuryResult = await spendTreasuryWithBudget(adminArray, {
        vault: 'REWARD',
        amount: 10,
    });

    assert.deepEqual(claimResult, {});
    assert.deepEqual(treasuryResult, {});
});

test('rpc errors bubble with rpc name context', async () => {
    const admin = {
        rpc: async () => ({
            data: null,
            error: { message: 'db failed' },
        }),
    };

    await assert.rejects(
        claimSoulAirdrop(admin, { userId: 'user-5' }),
        /\[claim_soul_airdrop\] db failed/
    );
});

test('idempotency keys pass through unchanged for treasury/internal calls', async () => {
    const calls = [];
    const admin = {
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            return { data: { status: 'IDEMPOTENT_SKIPPED' }, error: null };
        },
    };

    await spendTreasuryWithBudget(admin, {
        vault: 'INSURANCE',
        amount: 30,
        idempotencyKey: 'treasury-idem-1',
    });

    await appendSoulLedgerInternal(admin, {
        userId: 'user-6',
        amount: -7,
        type: 'SLASHING_BURN',
        idempotencyKey: 'ledger-idem-1',
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].name, SOUL_LEDGER_RPC.TREASURY_SPEND);
    assert.equal(calls[0].payload.p_idempotency_key, 'treasury-idem-1');
    assert.equal(calls[1].name, SOUL_LEDGER_RPC.APPEND_INTERNAL);
    assert.equal(calls[1].payload.p_idempotency_key, 'ledger-idem-1');
});
