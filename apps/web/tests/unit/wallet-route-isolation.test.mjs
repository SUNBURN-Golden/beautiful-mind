import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleWalletRequest } from '../../lib/server/wallet-handler.ts';

// ─── Test helpers ─────────────────────────────────────────────────────

const userA = 'aaaaaaaa-1111-2222-3333-444444444444';

function createFakeAdmin(fixtureData = {}) {
    const queries = [];

    function createChain(table) {
        const record = {
            table,
            selectCols: null,
            eqs: [],
            ins: [],
            orders: [],
            limits: [],
            isMaybeSingle: false,
        };

        const chain = {
            select(cols) {
                record.selectCols = cols;
                return chain;
            },
            eq(col, val) {
                record.eqs.push({ col, val });
                return chain;
            },
            in(col, vals) {
                record.ins.push({ col, vals });
                return chain;
            },
            order(col, opts) {
                record.orders.push({ col, opts });
                return chain;
            },
            limit(n) {
                record.limits.push(n);
                return chain;
            },
            maybeSingle() {
                record.isMaybeSingle = true;
                queries.push({
                    table: record.table,
                    selectCols: record.selectCols,
                    eqs: [...record.eqs],
                    ins: [...record.ins],
                    orders: [...record.orders],
                    limits: [...record.limits],
                    isMaybeSingle: true,
                });
                const data = fixtureData[table]?.maybeSingle ?? null;
                return Promise.resolve({ data });
            },
            then(resolve, reject) {
                queries.push({
                    table: record.table,
                    selectCols: record.selectCols,
                    eqs: [...record.eqs],
                    ins: [...record.ins],
                    orders: [...record.orders],
                    limits: [...record.limits],
                    isMaybeSingle: false,
                });
                const data = fixtureData[table]?.list ?? null;
                return Promise.resolve({ data }).then(resolve, reject);
            },
        };

        return chain;
    }

    return {
        queries,
        from(table) {
            return createChain(table);
        },
    };
}

function makeRequest(lang) {
    const url = lang
        ? `http://localhost/api/me/wallet?lang=${lang}`
        : 'http://localhost/api/me/wallet';
    return new Request(url);
}

async function callHandler({ admin, userId = userA, lang }) {
    const fakeResolve = async () => ({ admin, userId });
    const req = makeRequest(lang);
    const res = await handleWalletRequest(req, { resolveContext: fakeResolve });
    const body = await res.json();
    return { res, body };
}

// ─── 1. Authenticated self-read scoping ───────────────────────────────

describe('Authenticated self-read scoping', () => {
    it('queries user_wallets with user_id = authenticated user', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100, updated_at: '2026-01-01' } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const walletQuery = admin.queries.find(q => q.table === 'user_wallets');
        assert.ok(walletQuery, 'user_wallets query not found');
        assert.equal(walletQuery.isMaybeSingle, true);
        const userIdFilter = walletQuery.eqs.find(e => e.col === 'user_id');
        assert.ok(userIdFilter, 'user_wallets missing user_id eq');
        assert.equal(userIdFilter.val, userA);
    });

    it('queries token_ledger with user_id = authenticated user', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const ledgerQuery = admin.queries.find(q => q.table === 'token_ledger');
        assert.ok(ledgerQuery, 'token_ledger query not found');
        const userIdFilter = ledgerQuery.eqs.find(e => e.col === 'user_id');
        assert.ok(userIdFilter, 'token_ledger missing user_id eq');
        assert.equal(userIdFilter.val, userA);
    });

    it('queries token_holds with user_id = authenticated user', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const holdsQuery = admin.queries.find(q => q.table === 'token_holds');
        assert.ok(holdsQuery, 'token_holds query not found');
        const userIdFilter = holdsQuery.eqs.find(e => e.col === 'user_id');
        assert.ok(userIdFilter, 'token_holds missing user_id eq');
        assert.equal(userIdFilter.val, userA);
    });

    it('queries token_holds with state IN [PENDING, DISPUTED]', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const holdsQuery = admin.queries.find(q => q.table === 'token_holds');
        assert.ok(holdsQuery);
        assert.deepEqual(holdsQuery.ins, [{ col: 'state', vals: ['PENDING', 'DISPUTED'] }]);
    });

    it('queries token_ledger with order desc and limit 20', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const ledgerQuery = admin.queries.find(q => q.table === 'token_ledger');
        assert.ok(ledgerQuery);
        assert.deepEqual(ledgerQuery.orders, [{ col: 'created_at', opts: { ascending: false } }]);
        assert.deepEqual(ledgerQuery.limits, [20]);
    });

    it('queries all three tables', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        await callHandler({ admin, userId: userA });

        const tableNames = admin.queries.map(q => q.table);
        assert.ok(tableNames.includes('user_wallets'), 'missing user_wallets');
        assert.ok(tableNames.includes('token_ledger'), 'missing token_ledger');
        assert.ok(tableNames.includes('token_holds'), 'missing token_holds');
        assert.equal(tableNames.length, 3, `expected exactly 3 queries, got ${tableNames.length}: ${tableNames.join(', ')}`);
    });
});

// ─── 2. Cross-user fixture safety ────────────────────────────────────

describe('Cross-user fixture safety', () => {
    it('all three tables have user_id = userA eq filter', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [{ id: 'ledger-1', amount: 50, type: 'AIRDROP', created_at: '2026-01-01T00:00:00Z' }] },
            token_holds: { list: [{ id: 'hold-1', amount: 30, state: 'PENDING', created_at: '2026-01-01T00:00:00Z' }] },
        });
        await callHandler({ admin, userId: userA });

        const tables = ['user_wallets', 'token_ledger', 'token_holds'];
        for (const tableName of tables) {
            const query = admin.queries.find(q => q.table === tableName);
            assert.ok(query, `${tableName} query not recorded`);
            const userIdFilter = query.eqs.find(e => e.col === 'user_id');
            assert.ok(userIdFilter, `${tableName} missing user_id filter`);
            assert.equal(userIdFilter.val, userA, `${tableName} user_id != userA`);
        }
    });
});

// ─── 3. Response sanitization ─────────────────────────────────────────

describe('Response sanitization', () => {
    it('wallet object has required balance fields and currency', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100, updated_at: '2026-01-01' } },
            token_ledger: { list: [{ id: 'abc-1234-def', amount: 50, type: 'AIRDROP', created_at: '2026-01-01T00:00:00Z' }] },
            token_holds: { list: [{ id: 'xyz-5678-uvw', amount: 30, state: 'PENDING', created_at: '2026-01-01T00:00:00Z' }] },
        });
        const { body } = await callHandler({ admin });

        assert.equal(typeof body.wallet.totalBalance, 'number');
        assert.equal(typeof body.wallet.availableBalance, 'number');
        assert.equal(typeof body.wallet.heldBalance, 'number');
        assert.equal(body.wallet.currency, 'SOUL');
    });

    it('activity items use safe fields only', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [{ id: 'abc-1234-def-5678-ghij', amount: 50, type: 'AIRDROP', created_at: '2026-01-01T00:00:00Z' }] },
            token_holds: { list: [] },
        });
        const { body } = await callHandler({ admin });

        assert.equal(body.activity.length, 1);
        const item = body.activity[0];

        // Required fields present
        assert.ok('safeReference' in item, 'missing safeReference');
        assert.ok('label' in item, 'missing label');
        assert.ok('amount' in item, 'missing amount');
        assert.ok('direction' in item, 'missing direction');
        assert.ok('occurredAt' in item, 'missing occurredAt');
        assert.ok('status' in item, 'missing status');

        // No raw enum/id/meta leakage
        assert.equal('type' in item, false, 'raw type exposed');
        assert.equal('state' in item, false, 'raw state exposed');
        assert.equal('meta' in item, false, 'meta exposed');
        assert.equal('id' in item, false, 'raw id exposed');

        // safeReference max 8 chars for UUID-like ids
        assert.ok(item.safeReference.length <= 8, `safeReference too long: "${item.safeReference}"`);
    });

    it('holds items use safe fields only', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100 } },
            token_ledger: { list: [] },
            token_holds: { list: [{ id: 'xyz-5678-uvw-1234-abcd', amount: 30, state: 'PENDING', created_at: '2026-01-01T00:00:00Z' }] },
        });
        const { body } = await callHandler({ admin });

        assert.equal(body.holds.length, 1);
        const item = body.holds[0];

        // Required fields present
        assert.ok('safeReference' in item, 'missing safeReference');
        assert.ok('amount' in item, 'missing amount');
        assert.ok('statusLabel' in item, 'missing statusLabel');
        assert.ok('createdAt' in item, 'missing createdAt');

        // No raw enum/id/meta leakage
        assert.equal('type' in item, false, 'raw type exposed');
        assert.equal('state' in item, false, 'raw state exposed');
        assert.equal('meta' in item, false, 'meta exposed');
        assert.equal('id' in item, false, 'raw id exposed');

        assert.ok(item.safeReference.length <= 8, `safeReference too long: "${item.safeReference}"`);
    });
});

// ─── 4. Empty wallet behavior ─────────────────────────────────────────

describe('Empty wallet behavior', () => {
    it('returns zeros and empty arrays when no data exists', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: null },
            token_ledger: { list: [] },
            token_holds: { list: [] },
        });
        const { body } = await callHandler({ admin });

        assert.equal(body.wallet.totalBalance, 0);
        assert.equal(body.wallet.availableBalance, 0);
        assert.equal(body.wallet.heldBalance, 0);
        assert.equal(body.wallet.currency, 'SOUL');
        assert.deepEqual(body.activity, []);
        assert.deepEqual(body.holds, []);
    });
});

// ─── 5. Active holds calculation ──────────────────────────────────────

describe('Active holds calculation', () => {
    it('balance 100, PENDING 30 + DISPUTED 20 → held=50, available=50', async () => {
        const admin = createFakeAdmin({
            user_wallets: { maybeSingle: { balance: 100, updated_at: '2026-01-01' } },
            token_ledger: { list: [] },
            token_holds: {
                list: [
                    { id: 'h1', amount: 30, state: 'PENDING', created_at: '2026-01-01T00:00:00Z' },
                    { id: 'h2', amount: 20, state: 'DISPUTED', created_at: '2026-01-01T00:00:00Z' },
                ],
            },
        });
        const { body } = await callHandler({ admin });

        assert.equal(body.wallet.totalBalance, 100);
        assert.equal(body.wallet.heldBalance, 50);
        assert.equal(body.wallet.availableBalance, 50);
    });
});

// ─── 6. Locale behavior ──────────────────────────────────────────────

describe('Locale behavior', () => {
    const baseFixtures = {
        user_wallets: { maybeSingle: { balance: 0 } },
        token_ledger: { list: [{ id: 'l1', amount: 10, type: 'AIRDROP', created_at: '2026-01-01T00:00:00Z' }] },
        token_holds: { list: [{ id: 'h1', amount: 5, state: 'PENDING', created_at: '2026-01-01T00:00:00Z' }] },
    };

    it('lang=ko returns Korean labels', async () => {
        const admin = createFakeAdmin(baseFixtures);
        const { body } = await callHandler({ admin, lang: 'ko' });

        assert.equal(body.activity[0].label, 'SOUL 지급');
        assert.equal(body.holds[0].statusLabel, '보류 중');
    });

    it('lang=en returns English labels', async () => {
        const admin = createFakeAdmin(baseFixtures);
        const { body } = await callHandler({ admin, lang: 'en' });

        assert.equal(body.activity[0].label, 'SOUL grant');
        assert.equal(body.holds[0].statusLabel, 'Held');
    });

    it('lang=ja defaults to English labels', async () => {
        const admin = createFakeAdmin(baseFixtures);
        const { body } = await callHandler({ admin, lang: 'ja' });

        assert.equal(body.activity[0].label, 'SOUL grant');
        assert.equal(body.holds[0].statusLabel, 'Held');
    });
});

// ─── 7. Unauthorized behavior ─────────────────────────────────────────

describe('Unauthorized behavior', () => {
    it('returns 401 when resolveContext returns a Response', async () => {
        const fakeResolve = async () => new Response(
            JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Invalid or expired token' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
        const req = makeRequest();
        const res = await handleWalletRequest(req, { resolveContext: fakeResolve });

        assert.equal(res.status, 401);
        const body = await res.json();
        assert.ok(body.error, 'response should have error');
        assert.equal(body.error.code, 'AUTH_REQUIRED');
        assert.equal('wallet' in body, false, 'wallet data should not be present');
        assert.equal('activity' in body, false, 'activity data should not be present');
        assert.equal('holds' in body, false, 'holds data should not be present');
    });
});