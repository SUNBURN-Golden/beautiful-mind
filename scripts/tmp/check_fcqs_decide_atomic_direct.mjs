import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const src = fs.readFileSync(path.resolve('apps/web/scripts/execute-sql-raw.mjs'), 'utf8');
const m = src.match(/createClient\("([^"]+)",\s*"([^"]+)"\)/);
if (!m) {
  console.error('Cannot find FCQS credentials in script');
  process.exit(2);
}
const [, url, key] = m;
const supabase = createClient(url, key);

const { data, error } = await supabase.rpc('decide_audit_atomic', {
  p_audit_id: '00000000-0000-0000-0000-000000000000',
  p_decision: 'PASS',
  p_slash_amount: 0,
  p_note: 'existence probe',
  p_decision_by: null
});

if (error) {
  const missing = error.code === 'PGRST202' || String(error.message || '').includes('decide_audit_atomic');
  console.log(JSON.stringify({ ok: true, function_exists: !missing, error_code: error.code || null, error_message: error.message || null }));
  process.exit(0);
}

console.log(JSON.stringify({ ok: true, function_exists: true, data }));
