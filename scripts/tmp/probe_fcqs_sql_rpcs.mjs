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
const s = createClient(url, key);

const candidates = [
  { name: 'apply_patch', args: { sql_query: 'select 1 as ok' } },
  { name: 'run_sql', args: { query: 'select 1 as ok' } },
  { name: 'pg_execute_sql', args: { query: 'select 1 as ok' } },
  { name: 'exec_sql', args: { query: 'select 1 as ok' } },
  { name: 'execute_sql', args: { query: 'select 1 as ok' } },
];

const out = [];
for (const c of candidates) {
  try {
    const { data, error } = await s.rpc(c.name, c.args);
    out.push({ rpc: c.name, ok: !error, code: error?.code ?? null, message: error?.message ?? null, data_type: Array.isArray(data) ? 'array' : typeof data });
  } catch (e) {
    out.push({ rpc: c.name, ok: false, code: 'THROW', message: e?.message ?? String(e), data_type: null });
  }
}

console.log(JSON.stringify(out, null, 2));
