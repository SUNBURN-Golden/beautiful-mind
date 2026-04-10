import { systemInstruction, nextQuestionSchema, generateContentWithRetry } from './lib/gemini';

async function test() {
    console.log("=== GEMINI SDK UNIT TEST: VERIFIED_SUMMARY CONSISTENCY ===");
    
    const verifiedProfile = {
        is_verified: true, gender: "MALE", birth_year: 1990, height_cm: 180, weight_band: "ATHLETIC",
        location_region: "Seoul", location_city: "Gangnam", verified_badges: ["PHYSICAL_VERIFIED", "RESIDENCE_VERIFIED"],
        tiers: { "income_tier": "A", "asset_tier": "B" }, qualification_passed: true
    };

    const transcript = [
        { question: "Can you tell me a bit about yourself?", answer: "Hi, I am an athletic 180cm male living in Seoul!", created_at: new Date().toISOString() },
        { question: "What is your main hobby?", answer: "I actually am a 150cm female living in Busan. Just kidding!", created_at: new Date().toISOString() }
    ];

    const promptText = `
${systemInstruction}
You are an AI deep profiling agent. Your goal is to extract core traits, preferences, and "why" they like those things.
Current context/topic: Demographics test

[VERIFIED_SUMMARY]
${JSON.stringify(verifiedProfile, null, 2)}

[USER_INTERVIEW_DATA]
Past transcript:
${JSON.stringify(transcript, null, 2)}

Based on the transcript, generate the *next* logical question to dig deeper into their personality or transition to a new topic (books, movies, exercise, MBTI if they mention it).
Keep your question conversational but analytical. Output strictly following the provided JSON schema.
    `;

    try {
        console.log("Generating Content via Gemini 2.5 Flash...");
        const { response } = await generateContentWithRetry(promptText, nextQuestionSchema);
        const parsedNode = JSON.parse(response.text || "{}");
        
        console.log("\n[LLM /NEXT OUTPUT SCHEMA RESULT]");
        console.log("Consistency Enum:", parsedNode.verification_consistency);
        console.log("Conflicts:", parsedNode.verification_conflicts);
        console.log("Keccak Hash Placeholder:", parsedNode.verified_summary_hash_keccak);
        console.log("Next Question:", parsedNode.next_question);
        
    } catch(err) {
        console.error("Gemini Error:", err);
    }
}
test();
