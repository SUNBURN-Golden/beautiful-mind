import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const scriptPath = path.resolve('apps/web/scripts/execute-sql-raw.mjs');
const src = fs.readFileSync(scriptPath, 'utf8');
const m = src.match(/createClient\("([^"]+)",\s*"([^"]+)"\)/);
if (!m) {
  console.error('Cannot find FCQS credentials in script');
  process.exit(2);
}
const [, url, key] = m;
const supabase = createClient(url, key);

const sql = `
SELECT json_build_object(
  'has_decide_audit_atomic', EXISTS(
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'decide_audit_atomic'
  )
) AS result;
`;

const { data, error } = await supabase.rpc('apply_patch', { sql_query: sql });
if (error) {
  console.error('RPC_ERROR', error.code || '', error.message || '');
  process.exit(1);
}

let hasFn = null;
if (Array.isArray(data) && data[0]?.result?.has_decide_audit_atomic !== undefined) {
  hasFn = Boolean(data[0].result.has_decide_audit_atomic);
} else if (data?.result?.has_decide_audit_atomic !== undefined) {
  hasFn = Boolean(data.result.has_decide_audit_atomic);
}

console.log(JSON.stringify({ ok: true, has_decide_audit_atomic: hasFn }));
