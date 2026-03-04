import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { systemInstruction, finalizeSchema, generateContentWithRetry } from '@/lib/gemini';
import { ethers } from 'ethers';

function deepStableStringify(obj: any): string {
    if (obj === null || obj === undefined) return JSON.stringify(null);
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map(item => deepStableStringify(item)).join(',')}]`;
    const sortedKeys = Object.keys(obj).sort();
    const result = [];
    for (const key of sortedKeys) {
        result.push(`"${key}":${deepStableStringify(obj[key])}`);
    }
    return `{${result.join(',')}}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { interview_id, final_answer } = body;

        console.log('[SERVER DEBUG] Interview Finalize hit', { interview_id, has_answer: !!final_answer });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[SERVER DEBUG] Unauthorized access to finalize');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch the interview (auto-find if ID missing)
        let interview_query = supabaseAdmin.from('interviews').select('*').eq('user_id', user.id);
        if (interview_id) {
            interview_query = interview_query.eq('id', interview_id);
        } else {
            interview_query = interview_query.eq('status', 'IN_PROGRESS').order('created_at', { ascending: false }).limit(1);
        }

        const { data: interview, error: fetchErr } = await interview_query.maybeSingle();

        if (fetchErr || !interview) {
            console.log('[SERVER DEBUG] Interview not found', { user_id: user.id });
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        const transcript = interview.transcript_json || [];
        console.log('[SERVER DEBUG] Starting Gemini Finalization...', { transcript_len: transcript.length });
        // Fetch PII-Free User Verified Profile for the Subject
        const { data: verifiedProfile } = await supabaseAdmin
            .from('user_verified_profile')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const stableSummaryStr = deepStableStringify(verifiedProfile || {});
        const verifiedSummaryHash = ethers.keccak256(ethers.toUtf8Bytes(stableSummaryStr));

        // Call Gemini to Finalize
        const promptText = `
${systemInstruction}
You must analyze the following interview transcript and evaluate the user strictly against the output schema.
Extract raw preferences (books, movies, exercises) and derived traits. 
Do NOT guess MBTI unless the user explicitly stated it.
Output valid JSON only.

[VERIFIED_SUMMARY]
${JSON.stringify(verifiedProfile || {}, null, 2)}

[USER_INTERVIEW_DATA]
Transcript:
${JSON.stringify(transcript, null, 2)}
        `;

        let parsedNode: any = null;
        let retryCount = 0;
        const maxRetries = 1;
        let finalModel = 'gemini-2.5-flash';

        while (retryCount <= maxRetries) {
            try {
                const { response, modelUsed } = await generateContentWithRetry(promptText, finalizeSchema);
                finalModel = modelUsed;

                parsedNode = JSON.parse(response.text || '{}');
                break; // If parse succeeds, break out of loop
            } catch (err) {
                console.warn(`JSON Parse or API failed on attempt ${retryCount + 1}`, err);
                retryCount++;
                if (retryCount > maxRetries) {
                    parsedNode = {
                        stage: "FINAL",
                        decision: "REVIEW",
                        score: 0,
                        risk_flags: ["JSON_PARSE_FAIL"],
                        summary: "Failed to parse final AI output.",
                        absolute_score: 0,
                        raw_preferences: { books: [], movies: [], exercise: [], mbti: { self_reported: false, type: null } },
                        derived_traits: { intellectual_complexity: "MEDIUM", stimulation_seeking: "MODERATE", discipline_level: "MEDIUM", social_energy: "AMBIVERT", vibe_tags: [] }
                    };
                }
            }
        }

        // Format for DB Upsert
        const analysisJson = {
            raw_preferences: parsedNode.raw_preferences,
            derived_traits: parsedNode.derived_traits,
            stage: parsedNode.stage,
            verification_consistency: parsedNode.verification_consistency || 'UNKNOWN',
            verification_conflicts: parsedNode.verification_conflicts || [],
            verified_summary_hash_keccak: verifiedSummaryHash
        };

        // Combine existing risk flags with parsed flags
        const existingFlags = Array.isArray(interview.risk_flags) ? interview.risk_flags : [];
        const newFlags = Array.isArray(parsedNode.risk_flags) ? parsedNode.risk_flags : [];
        const combinedRiskFlags = Array.from(new Set([...existingFlags, ...newFlags]));

        // 1. Update interviews table (using admin client)
        const { error: interviewError } = await supabaseAdmin
            .from('interviews')
            .update({
                analysis_json: analysisJson,
                decision: parsedNode.decision,
                absolute_score: parsedNode.absolute_score || parsedNode.score, // Handle dual mapping
                score: parsedNode.score,
                risk_flags: combinedRiskFlags,
                summary: parsedNode.summary,
                model_version: finalModel,
                status: 'DONE'
            })
            .eq('id', interview.id);

        if (interviewError) {
            console.error('Failed to update interview:', interviewError);
            return NextResponse.json({ error: 'DB Update Failed', details: interviewError.message }, { status: 500 });
        }

        // 2. Upsert user_traits table (matching cache)  (using admin client) -> Service Role Write Only
        if (parsedNode.decision === 'PASS') {
            await supabaseAdmin
                .from('user_traits')
                .upsert({
                    user_id: user.id,
                    traits_json: analysisJson,
                    absolute_score: parsedNode.absolute_score || parsedNode.score,
                    updated_at: new Date().toISOString()
                });
        }

        console.log('[SERVER DEBUG] Interview Finalized Successfully', { interview_id: interview.id });
        return NextResponse.json(parsedNode);

    } catch (error: any) {
        console.error('Interview Finalize Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
