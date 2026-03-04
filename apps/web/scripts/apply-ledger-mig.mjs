import fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function runSQL() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sqlPath = '../../supabase/migrations/20260225000000_private_ledger.sql';
    
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Attempt to execute via query API endpoint (common in remote dashboard integrations)
    // Note: The public REST API of Supabase PostgREST does NOT support direct raw DDL execution.
    // So this will try an RPC if one exists, otherwise we'll print instructions for the user.
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Check if the user ran 20260223_init_schema which often includes exec_sql
    const { error: rpcErr } = await supabase.rpc('pg_execute_sql', { query: sql });
    
    if (rpcErr && rpcErr.code === 'PGRST202') {
        console.error('SERVER NEEDS MANUAL INTERVENTION:');
        console.error('The database connection string is not exposed in .env.local, and the RPC to execute raw SQL is missing.');
        console.error('Please manually copy the contents of `supabase/migrations/20260225000000_private_ledger.sql`');
        console.error('and run it in the Supabase Dashboard SQL Editor.');
    } else if (rpcErr) {
        console.error('Failed to run RPC:', rpcErr);
    } else {
        console.log('Successfully ran migration via RPC!');
    }
}
runSQL();
