import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const TARGET_IDS = [
    'ac905716-28ae-45ac-8549-699f7c6f50d4', // portone.test.1771833251493@example.com
    '5f319697-6e6c-4ce0-89e5-e662ed0d73ee'  // testuser_6j89bx@test.com
];

// Mapping of tables to their corresponding user_id column names based on migrations
const tableColumns: Record<string, string[]> = {
    'profiles': ['id'],
    'record_reviews': ['viewer_id', 'reviewer_id'],
    'review_assignments': ['reviewer_id', 'target_id'],
    'admission_applications': ['user_id', 'reviewed_by'],
    'private_ledger': ['user_id'],
    'sbt_claims': ['user_id'],
    'audits': ['subject_user_id', 'decision_by'],
    'challenges': ['challenger_user_id', 'subject_user_id'],
    'collateral_accounts': ['user_id'],
    'enforcement_actions': ['target_user_id', 'decision_by'],
    'fraud_slashing_events': ['offender_user_id', 'beneficiary_user_id'],
    'identity_claims': ['user_id'],
    'interviews': ['user_id'],
    'verifications': ['user_id'],
    'consents': ['user_id'],
    'contracts': ['user_id'],
    'audit_logs': ['user_id'],
    'token_ledger': ['user_id']
};

async function main() {
    console.log("Starting exhaustive dependency cleanup...");
    for (const uid of TARGET_IDS) {
        console.log(`\nProcessing UID: ${uid}`);

        // Concurrently clear all dependencies to speed up
        const deletePromises = [];
        for (const [table, columns] of Object.entries(tableColumns)) {
            for (const col of columns) {
                deletePromises.push(
                    supabaseAdmin.from(table).delete().eq(col, uid).then(({ error }) => {
                        // Ignore table not found or column not found errors silently
                        if (error && error.code !== '42P01' && error.code !== '42703') {
                            console.error(`[${table}.${col}] Delete Warning:`, error.message);
                        }
                    })
                );
            }
        }
        await Promise.all(deletePromises);

        console.log(`Dependencies cleared. Attempting to delete user ${uid} from auth.users...`);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (delError) {
            console.error(`  => Failed to delete ${uid}:`, delError);
        } else {
            console.log(`  => ✅ Successfully deleted ${uid} from auth.users`);
        }
    }
}

main().catch(console.error);
