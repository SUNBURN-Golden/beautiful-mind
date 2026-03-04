import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runRawQueries() {
    console.log('=== VERIFYING REVIEW PIPELINE HOTFIX (Phase 3 Step 0.2.1) ===\n');

    // (1) review 테이블/트리거 현황
    const { data: triggers, error: err1 } = await s.rpc('run_sql', {
        query: `
            SELECT c.relname AS table_name, t.tgname AS trigger_name, pg_get_triggerdef(t.oid) AS def
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname='public'
            AND c.relname IN ('review_sessions','review_facts','review_questions','review_drafts','review_signatures','review_session_raw','review_unlocks')
            AND NOT t.tgisinternal
            ORDER BY table_name, trigger_name;
        `
    });

    if (err1) {
        console.error('For Trigger Query to work via RPC, a secure execute_sql function must exist. Falling back to simple REST fetching.');
        console.log('--- REST Fallbacks ---');

        // Let's at least check if new tables/columns exist via simple ops
        const { error: errCols } = await s.from('review_sessions').select('met_at, due_at, reveal_at, finalized_at, view_fee').limit(1);
        console.log(`1) review_sessions new columns exist: ${errCols ? 'FAIL' : 'PASS'}`);

        const { error: errRaw } = await s.from('review_session_raw').select('*').limit(1);
        console.log(`2) review_session_raw table exists: ${errRaw ? 'FAIL' : 'PASS'}`);

        const { error: errUnlock } = await s.from('review_unlocks').select('*').limit(1);
        console.log(`3) review_unlocks table exists: ${errUnlock ? 'FAIL' : 'PASS'}`);

    } else {
        console.log('1) Triggers:');
        console.table(triggers);
    }

    // (4) review_sessions에 raw가 남아있는지
    const { count, error: countErr } = await s.from('review_sessions')
        .select('*', { count: 'exact', head: true })
        .or('user_raw_text.neq.null,user_raw_hash.neq.null');

    if (countErr) {
        console.error('Error fetching raw text count:', countErr);
    } else {
        console.log(`\n4) rows_with_raw in review_sessions (Should be 0 due to migration): ${count}`);
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
}

runRawQueries();
