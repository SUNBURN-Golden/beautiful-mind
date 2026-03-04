import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('missing env');
  process.exit(2);
}

const res = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/openapi+json'
  }
});

if (!res.ok) {
  console.error('openapi_fetch_failed', res.status, await res.text());
  process.exit(1);
}

const spec = await res.json();
const paths = Object.keys(spec.paths || {});
const rpcNames = paths
  .filter((p) => p.startsWith('/rpc/'))
  .map((p) => p.replace('/rpc/', ''))
  .sort();

console.log(JSON.stringify({ rpc_count: rpcNames.length, rpc_names: rpcNames }, null, 2));
