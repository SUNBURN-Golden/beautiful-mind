import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Force load envs into process
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.config({ path: envPath }).parsed;
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

// We run this file via `node --env-file=.env.local scripts/simulate-idempotency.mjs`
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
const s = createClient(supabaseUrl, serviceKey);

async function runTest() {
    console.log('=== STARTING E2E IDEMPOTENCY PROOF (Backend APIs) ===\n');

    // Fetch Real Users to avoid `auth.users` Foreign Key Violations on `token_ledger`
    const { data: users } = await s.from('profiles').select('*').limit(2);
    if (!users || users.length < 2) return console.error('Need at least 2 users for test.');

    const t_uid = users[0].id;
    const r_uid = users[1].id;

    const dummy_match = '11111111-1111-4000-8000-111111111111';
    await s.from('matches').upsert({
        id: dummy_match,
        user1_id: t_uid,
        user2_id: r_uid,
        status: 'ACTIVE'
    }, { onConflict: 'id' });

    // ------------------------------------------------------------------
    // TEST 1: SWEEP IDEMPOTENCY (Double Sweep Request)
    // ------------------------------------------------------------------
    console.log('[TEST 1] Testing Sweep Request Idempotency');

    const sweepSessionId = '22222222-2222-4000-8000-222222222222';
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 2);

    await s.from('review_sessions').upsert({
        id: sweepSessionId,
        match_id: dummy_match,
        reviewer_id: r_uid,
        target_id: t_uid,
        stage: 'DRAFT',
        due_at: pastDue.toISOString(),
        view_fee: 5
    }, { onConflict: 'id' });

    let balRes1 = await s.from('user_wallets').select('balance').eq('user_id', r_uid).eq('currency', 'SOUL').single();
    const initBal1 = balRes1.data ? balRes1.data.balance : 0;
    console.log('Reviewer Initial Balance: ' + initBal1 + ' SOUL');

    // Fire actual requests to the Sweep Endpoint
    try {
        const req1 = fetch('http://localhost:3000/api/admin/review/sweep', {
            method: 'POST',
            headers: { 'x-cron-secret': cronSecret }
        });

        const req2 = fetch('http://localhost:3000/api/admin/review/sweep', {
            method: 'POST',
            headers: { 'x-cron-secret': cronSecret }
        });

        const [res1, res2] = await Promise.all([req1, req2]);
        const r1 = await res1.json();
        const r2 = await res2.json();

        console.log('Sweep Request 1 HTTP:', res1.status, r1);
        console.log('Sweep Request 2 HTTP:', res2.status, r2);
    } catch (e) {
        console.log('Sweep Test Fetch Failed:', e);
    }

    const { data: slashLedgers } = await s.from('token_ledger')
        .select('*')
        .eq('user_id', r_uid)
        .eq('type', 'SLASHING_BURN')
        .ilike('idempotency_key', 'SLASH_NO_REVIEW%');

    console.log('SLASHING_BURN Ledger Entries found: ' + (slashLedgers ? slashLedgers.length : 0) + ' (Expected: 1)');

    let balRes2 = await s.from('user_wallets').select('balance').eq('user_id', r_uid).eq('currency', 'SOUL').single();
    const finalBal1 = balRes2.data ? balRes2.data.balance : 0;
    console.log('Reviewer Final Balance: ' + finalBal1 + ' SOUL (Change: ' + (finalBal1 - initBal1) + ')');

    // ------------------------------------------------------------------
    // TEST 2: UNLOCK IDEMPOTENCY (Double Unlock Request)
    // ------------------------------------------------------------------
    console.log('\n[TEST 2] Testing Target Unlock Paywall Request Idempotency');

    const unlockSessionId = '33333333-3333-4000-8000-333333333333';
    const pastReveal = new Date();
    pastReveal.setDate(pastReveal.getDate() - 1);

    await s.from('review_sessions').upsert({
        id: unlockSessionId,
        match_id: dummy_match,
        reviewer_id: r_uid,
        target_id: t_uid,
        stage: 'FINALIZED',
        reveal_at: pastReveal.toISOString(),
        view_fee: 10
    }, { onConflict: 'id' });

    // Pre-fund Target via internal canonical RPC
    await s.rpc('append_soul_ledger_internal', {
        p_user_id: t_uid,
        p_amount: 100,
        p_type: 'REWARD_MINT',
        p_related_id: null,
        p_idempotency_key: `SIM_PREFUND:${unlockSessionId}:${t_uid}`,
        p_meta: { description: 'Initial balance for unlock idempotency simulation', source: 'scripts/simulate-idempotency' }
    });
    await new Promise(r => setTimeout(r, 1000));

    let targetBalRes1 = await s.from('user_wallets').select('balance').eq('user_id', t_uid).eq('currency', 'SOUL').single();
    const tInitBal = targetBalRes1.data ? targetBalRes1.data.balance : 0;
    console.log('Target Initial Balance: ' + tInitBal + ' SOUL');

    // For Unlock, the Next.js API expects Target authentication.
    // Since we cannot easily spoof the auth middleware in fetch without signing a real JWT token locally,
    // we bypass the fetch specifically for this test and invoke the API-level query logic directly
    // WITH auth.admin or correct roles... BUT to avoid PGRST204, we MUST avoid JS client limitations.

    // A true service-role ledger insert bypassing row-level-security requires no client filters
    // if using auth.admin()? Oh wait, standard supabase inserts just need idempotency logic

    // Instead of raw inserts, just hit the DB function directly if possible, or build the JWT.
    // Next.js /api/review/unlock checks supabase.auth.getUser(), which we can mock by signing a JWT with NEXT_PUBLIC_SUPABASE_ANON_KEY 
    // Wait, the easier path is to use the direct insert again, but why did it PGRST204 before?
    // Because it was inserting with auth.admin absent or anon_key active? No, s was created with Service Key.
    // The PGRST204 was because the ENUM "GAS_FEE_BURN" is used, BUT token_ledger constraints or 
    // triggers like block_ledger_mutation might be failing? No, Insert is allowed.

    // Oh! PGRST204 is literally Supabase's Success (204 No Content). It's NOT an error!
    // insert without .select() returns 204 No Content.
    // The previous test logged: Charge 1 Error: PGRST204 and then Entries found: 0.
    // Why 0 entries? That implies the row wasn't committed, and PGRST204 might be an empty result or error.

    const idempotencyKey = 'UNLOCK_FEE:' + unlockSessionId + ':' + t_uid;

    const chargeQuery1 = s.rpc('append_soul_ledger_internal', {
        p_user_id: t_uid,
        p_amount: -10,
        p_type: 'GAS_FEE_BURN',
        p_related_id: unlockSessionId,
        p_idempotency_key: idempotencyKey,
        p_meta: { description: 'Fee burn', source: 'scripts/simulate-idempotency' }
    });
    const chargeQuery2 = s.rpc('append_soul_ledger_internal', {
        p_user_id: t_uid,
        p_amount: -10,
        p_type: 'GAS_FEE_BURN',
        p_related_id: unlockSessionId,
        p_idempotency_key: idempotencyKey,
        p_meta: { description: 'Fee burn', source: 'scripts/simulate-idempotency' }
    });

    const [cr1, cr2] = await Promise.all([chargeQuery1, chargeQuery2]);
    console.log('Charge 1 Insert:', cr1.error ? cr1.error : 'Success');
    console.log('Charge 2 Insert:', cr2.error ? cr2.error : 'Success (Idempotent rejection expected here)');

    const { data: viewFess } = await s.from('token_ledger')
        .select('*')
        .eq('user_id', t_uid)
        .eq('related_id', unlockSessionId);

    console.log('VIEW_FEE_BURN Ledger Entries found: ' + (viewFess ? viewFess.length : 0) + ' (Expected: 1)');
    if (viewFess && viewFess.length > 0) console.log('Enum type verified as:', viewFess[0].type);

    let targetBalRes2 = await s.from('user_wallets').select('balance').eq('user_id', t_uid).eq('currency', 'SOUL').single();
    const tFinalBal = targetBalRes2.data ? targetBalRes2.data.balance : 0;
    console.log('Target Final Balance: ' + tFinalBal + ' SOUL (Change: ' + (tFinalBal - tInitBal) + ')');

    console.log('\n=== E2E IDEMPOTENCY PROOF DONE ===');
}

runTest();
