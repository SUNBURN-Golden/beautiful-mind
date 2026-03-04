import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Personas
// Angel: 4.5~5.0
// Critic: 1.5~2.5
// Tier-Driven: highly correlated with target absolute_score
// Average: 2.5~4.0

async function createDummyUsers(num) {
    console.log(`Creating ${num} dummy users for simulation...`);
    const createdUsers = [];
    for (let i = 0; i < num; i++) {
        const email = `sim_user_${Date.now()}_${i}@example.com`;
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true
        });
        if (authErr) {
            console.error('Failed to create user:', authErr);
            continue;
        }
        const uid = authData.user.id;

        // Ensure profile is verified
        await supabaseAdmin.from('profiles').update({ verified: true }).eq('id', uid);

        // Insert dummy trait
        await supabaseAdmin.from('user_traits').insert({
            user_id: uid,
            absolute_score: 40 + Math.floor(Math.random() * 50),
            traits_json: {
                stage: "FINAL",
                raw_preferences: {
                    mbti: { type: "INTJ", self_reported: true },
                    books: [], movies: [], exercise: []
                },
                derived_traits: {
                    vibe_tags: ["simulated"],
                    social_energy: "AMBIVERT",
                    discipline_level: "HIGH",
                    stimulation_seeking: "MODERATE",
                    intellectual_complexity: "HIGH"
                }
            }
        });
        createdUsers.push(uid);
    }
    return createdUsers;
}

async function runSeed() {
    console.log('--- STARTING FEEDBACK SIMULATOR ---');

    const { data: traits } = await supabaseAdmin.from('user_traits').select('*');
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('verified', true).eq('banned', false);

    let eligibleUsers = (traits || []).filter(t => profiles?.find(p => p.id === t.user_id));

    if (eligibleUsers.length < 10) {
        const needed = 10 - eligibleUsers.length;
        await createDummyUsers(needed);

        const { data: newTraits } = await supabaseAdmin.from('user_traits').select('*');
        const { data: newProfiles } = await supabaseAdmin.from('profiles').select('*').eq('verified', true).eq('banned', false);
        eligibleUsers = (newTraits || []).filter(t => newProfiles?.find(p => p.id === t.user_id));
    }

    console.log(`Using ${eligibleUsers.length} users for simulation...`);

    // Assign Personas
    const personas = {};
    const pTypes = ['Angel', 'Critic', 'Tier-Driven', 'Average', 'Average'];

    eligibleUsers.forEach((u, i) => {
        personas[u.user_id] = pTypes[i % pTypes.length];
        console.log(`Assigned ${pTypes[i % pTypes.length]} to ${u.user_id}`);
    });

    const reviews = [];

    // Everyone reviews everyone else (simulation only)
    for (let i = 0; i < eligibleUsers.length; i++) {
        for (let j = i + 1; j < eligibleUsers.length; j++) {

            const userA = eligibleUsers[i];
            const userB = eligibleUsers[j];

            // 1. Create a Match first so we have a match_id for the reviews
            const [u1, u2] = [userA.user_id, userB.user_id].sort();
            await supabaseAdmin.from('matches').insert({
                user1_id: u1,
                user2_id: u2,
                status: 'ACTIVE',
                match_score: 5.0,
                algorithm_version: 'simulation'
            });

            // Fetch the match ID (whether just inserted or previously existed)
            const { data: matchData } = await supabaseAdmin.from('matches')
                .select('id')
                .eq('user1_id', u1)
                .eq('user2_id', u2)
                .single();

            const matchId = matchData ? matchData.id : null;

            if (!matchId) continue;

            // 2. Generate Review from A -> B
            const personaA = personas[userA.user_id];
            let scoreA2B = 3.0;
            if (personaA === 'Angel') scoreA2B = 4.5 + Math.random() * 0.5;
            else if (personaA === 'Critic') scoreA2B = 1.0 + Math.random() * 1.5;
            else if (personaA === 'Average') scoreA2B = 2.5 + Math.random() * 1.5;
            else if (personaA === 'Tier-Driven') {
                scoreA2B = 1.0 + ((userB.absolute_score || 50) / 100) * 4.0 + (Math.random() - 0.5);
            }
            scoreA2B = Math.max(1.0, Math.min(5.0, scoreA2B));

            reviews.push({
                match_id: matchId,
                reviewer_id: userA.user_id,
                target_id: userB.user_id,
                score: Math.round(scoreA2B), // DB uses INTEGER for score
                feedback_text: JSON.stringify({ simulated_persona: personaA }),
                created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString()
            });

            // 3. Generate Review from B -> A
            const personaB = personas[userB.user_id];
            let scoreB2A = 3.0;
            if (personaB === 'Angel') scoreB2A = 4.5 + Math.random() * 0.5;
            else if (personaB === 'Critic') scoreB2A = 1.0 + Math.random() * 1.5;
            else if (personaB === 'Average') scoreB2A = 2.5 + Math.random() * 1.5;
            else if (personaB === 'Tier-Driven') {
                scoreB2A = 1.0 + ((userA.absolute_score || 50) / 100) * 4.0 + (Math.random() - 0.5);
            }
            scoreB2A = Math.max(1.0, Math.min(5.0, scoreB2A));

            reviews.push({
                match_id: matchId,
                reviewer_id: userB.user_id,
                target_id: userA.user_id,
                score: Math.round(scoreB2A), // DB uses INTEGER for score
                feedback_text: JSON.stringify({ simulated_persona: personaB }),
                created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString()
            });
        }
    }

    console.log(`Generated ${reviews.length} simulated reviews.`);

    for (let chunk = 0; chunk < reviews.length; chunk += 100) {
        const batch = reviews.slice(chunk, chunk + 100);
        // ignore conflicts in case they've already reviewed
        const { error: insErr } = await supabaseAdmin.from('match_reviews').upsert(batch, { onConflict: 'match_id,reviewer_id', ignoreDuplicates: true });
        if (insErr) {
            console.error('Failed to insert simulated reviews:', insErr);
        } else {
            console.log(`Inserted chunk ${chunk / 100 + 1}`);
        }
    }

    console.log('--- FEEDBACK SIMULATION DONE ---');
}

runSeed();
