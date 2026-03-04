import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { users } } = await supabase.auth.admin.listUsers();
    if (!users || users.length === 0) return console.log("No users.");
    
    const user = users[0];
    console.log("=== PHASE 2.6: VERIFIED SUMMARY E2E TEST ===");
    console.log(`Target User: ${user.id}`);

    // 1. Setup Mock PII-Free Verified Data
    await supabase.from("profiles").update({
        is_verified: true,
        gender: "MALE",
        birth_year: 1990,
        height_cm: 180,
        weight_band: "ATHLETIC",
        location_region: "Seoul",
        location_city: "Gangnam",
        verified_badges: ["PHYSICAL_VERIFIED", "RESIDENCE_VERIFIED"],
        tiers: { "income_tier": "A", "asset_tier": "B" },
        qualification_passed: true
    }).eq("id", user.id);

    // 2. Setup a mock interview in progress
    const { data: interview, error: iErr } = await supabase.from("interviews").insert({
        user_id: user.id,
        status: "IN_PROGRESS",
        transcript_json: [
            { question: "Can you tell me a bit about yourself?", answer: "Hi, I am an athletic 180cm male living in Seoul!", created_at: new Date().toISOString() },
            { question: "What is your main hobby?", answer: "I love CrossFit.", created_at: new Date().toISOString() },
            { question: "Tell me a lie about yourself.", answer: null, created_at: new Date().toISOString() }
        ]
    }).select("id").single();
    
    if (iErr) return console.error("Interview Error:", iErr);

    console.log("[INJECTING CONFLICTING CLAIM VIA LLM NEXT ROUTE]");
    // 3. Hit the NEXT API with a conflicting claim
    const fetch = globalThis.fetch;
    const res = await fetch("http://localhost:3000/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            interview_id: interview.id,
            last_answer: "I am actually a 150cm female living in Busan. Just kidding, I am a 1990 MALE. But what if I was a female?",
            context: { topic: "Demographics test" }
        })
    });
    
    const nextResponse = await res.json();
    console.log("\n[LLM /NEXT OUTPUT SCHEMA]");
    console.log("Consistency Enum:", nextResponse.verification_consistency);
    console.log("Conflicts Flagged:", nextResponse.verification_conflicts);
    console.log("Keccak Hash:", nextResponse.verified_summary_hash_keccak);
    console.log("Next Question:", nextResponse.next_question);

    // 4. Test the FINALIZE route
    console.log("\n[TESTING /FINALIZE COMBINED PARSING]");
    const fRes = await fetch("http://localhost:3000/api/interview/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: interview.id })
    });
    const finalResponse = await fRes.json();
    
    // 5. Check DB storage to prove the hash and schema expansion was saved
    const { data: dbCheck } = await supabase.from("interviews").select("analysis_json, transcript_json").eq("id", interview.id).single();
    
    console.log("\n[DATABASE ANALYSIS_JSON SAVED OBJECT]");
    console.log("Consistency in DB:", dbCheck.analysis_json.verification_consistency);
    console.log("Keccak Hash in DB:", dbCheck.analysis_json.verified_summary_hash_keccak);
    
    // Cleanup
    await supabase.from("interviews").delete().eq("id", interview.id);
}
test();
