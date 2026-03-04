import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const sql = `
    DELETE FROM public.token_ledger WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.collateral_accounts WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.enforcement_actions WHERE target_user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.challenges WHERE challenger_user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee') OR subject_user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.audits WHERE subject_user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.sbt_claims WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.contracts WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.consents WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.verifications WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.identity_claims WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.interviews WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.audit_logs WHERE user_id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    DELETE FROM public.profiles WHERE id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
    
    DELETE FROM auth.users WHERE id IN ('ac905716-28ae-45ac-8549-699f7c6f50d4', '5f319697-6e6c-4ce0-89e5-e662ed0d73ee');
  `;

    console.log("Executing raw SQL deletion on FCQS...");
    const { data, error } = await supabase.rpc('apply_patch', { sql_query: sql });
    if (error) {
        console.error("SQL Error:", error);
    } else {
        console.log("Deletion completed via raw SQL. Response:", data);
    }
}

run();
