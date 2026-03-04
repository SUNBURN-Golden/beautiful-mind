import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.test.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const TARGET_IDS = [
    'ac905716-28ae-45ac-8549-699f7c6f50d4', // portone.test.1771833251493@example.com
    '5f319697-6e6c-4ce0-89e5-e662ed0d73ee'  // testuser_6j89bx@test.com
];

async function main() {
    console.log("Starting targeted user deletion...");
    for (const uid of TARGET_IDS) {
        console.log(`Attempting to delete user ${uid}...`);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (delError) {
            console.error(`  => Failed to delete ${uid}:`, delError);
        } else {
            console.log(`  => Successfully deleted ${uid}`);
        }
    }
}

main().catch(console.error);
