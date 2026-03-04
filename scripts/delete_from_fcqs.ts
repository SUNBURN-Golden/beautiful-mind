import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const TARGET_IDS = [
    'ac905716-28ae-45ac-8549-699f7c6f50d4', // portone.test.1771833251493@example.com
    '5f319697-6e6c-4ce0-89e5-e662ed0d73ee'  // testuser_6j89bx@test.com
];

const tablesWithUserId = [
    'token_ledger', 'collateral_accounts', 'sbt_claims', 'contracts',
    'consents', 'verifications', 'identity_claims', 'interviews', 'profiles'
];

async function main() {
    console.log("Starting targeted user deletion with manual cascade on FCQS (Production)...");
    for (const uid of TARGET_IDS) {
        console.log(`\nCleaning up dependencies for user ${uid}...`);

        // Clear relations that use custom user_id column names
        await supabaseAdmin.from('enforcement_actions').delete().eq('target_user_id', uid);
        await supabaseAdmin.from('challenges').delete().eq('challenger_user_id', uid);
        await supabaseAdmin.from('challenges').delete().eq('subject_user_id', uid);
        await supabaseAdmin.from('audits').delete().eq('subject_user_id', uid);

        // Clear standard relations
        for (const table of tablesWithUserId) {
            await supabaseAdmin.from(table).delete().eq('user_id', uid);
        }

        console.log(`Attempting to delete user ${uid} from auth.users...`);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (delError) {
            console.error(`  => Failed to delete ${uid}:`, delError);
        } else {
            console.log(`  => Successfully deleted ${uid} from auth.users`);
        }
    }
}

main().catch(console.error);
