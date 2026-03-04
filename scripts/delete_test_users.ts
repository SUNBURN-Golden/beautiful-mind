import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from apps/web/.env.local
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const EXCEPTED_EMAILS = [
    'justice.parkit@gmail.com',
    'admin@beautifulmind.com',
    'maybish@naver.com'
];

async function main() {
    console.log("Starting bulk user deletion...");
    console.log("Protected accounts:", EXCEPTED_EMAILS.join(", "));

    let hasMore = true;
    let page = 1;
    let deletedCount = 0;

    while (hasMore) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page: page,
            perPage: 1000,
        });

        if (error) {
            console.error("Error fetching users:", error);
            break;
        }

        const users = data.users;
        if (users.length === 0) {
            hasMore = false;
            break;
        }

        for (const user of users) {
            const email = user.email?.toLowerCase();
            if (email && EXCEPTED_EMAILS.includes(email)) {
                console.log(`[SKIP] Protected user: ${email} (${user.id})`);
                continue;
            }

            console.log(`[DELETE] User: ${email || user.id} (${user.id})...`);
            const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
            if (delError) {
                console.error(`  => Failed to delete user ${user.id}:`, delError);
            } else {
                deletedCount++;
            }
        }

        // Usually auth list users returns 0 if requested page is out of bounds, but if it returns less than perPage, it's the last page.
        if (users.length < 1000) {
            hasMore = false;
        } else {
            page++;
        }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} test users.`);
}

main().catch(console.error);
