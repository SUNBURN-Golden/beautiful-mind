import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifySoulUpgrade() {
    console.log('=== VERIFYING SOUL UPGRADE (PHASE 3 STEP 0.1) ===\n');

    // 1. economy_config
    const { data: config, error: err1 } = await s.from('economy_config').select('*');
    if (err1) console.error('Error fetching economy_config:', err1);
    else {
        console.log('1) SELECT * FROM economy_config;');
        console.table(config);
    }

    // 2. soul_airdrop_claims
    const { data: claims, error: err2 } = await s.from('soul_airdrop_claims').select('*').order('claim_no', { ascending: true }).limit(20);
    if (err2) console.error('\nError fetching soul_airdrop_claims:', err2);
    else {
        console.log('\n2) SELECT * FROM soul_airdrop_claims ORDER BY claim_no ASC LIMIT 20;');
        if (claims.length === 0) console.log('(No airdrops claimed yet)');
        else console.table(claims);
    }

    // 3. treasury_vaults
    const { data: vaults, error: err3 } = await s.from('treasury_vaults').select('*');
    if (err3) console.error('\nError fetching treasury_vaults:', err3);
    else {
        console.log('\n3) SELECT * FROM treasury_vaults;');
        console.table(vaults);
    }

    // 4. match_reviews (LLM Coauthoring columns)
    const { data: reviews, error: err4 } = await s.from('match_reviews')
        .select('id, user_raw_text, llm_draft_text, final_text, final_signed_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (err4) console.error('\nError fetching match_reviews:', err4);
    else {
        console.log('\n4) SELECT id, user_raw_text, llm_draft_text, final_text, final_signed_at FROM match_reviews ORDER BY created_at DESC LIMIT 5;');
        if (reviews.length === 0) console.log('(No match reviews exist yet)');
        else console.table(reviews);
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
}

verifySoulUpgrade();
