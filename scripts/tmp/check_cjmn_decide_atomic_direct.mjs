import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('.env.local') });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('missing env');
  process.exit(2);
}
const s = createClient(url, key);
const { data, error } = await s.rpc('decide_audit_atomic', {
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
