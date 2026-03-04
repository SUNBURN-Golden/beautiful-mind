import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ai, systemInstruction, finalizeSchema } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { interview_id } = body;

        if (!interview_id) {
            return NextResponse.json({ error: 'Missing interview_id' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch the interview
        const { data: interview } = await supabase
            .from('interviews')
            .select('*')
            .eq('id', interview_id)
            .eq('user_id', user.id)
            .single();

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        const transcript = interview.transcript_json || [];

        // Call Gemini to Finalize
        const promptText = `
${systemInstruction}
You must analyze the following interview transcript and evaluate the user strictly against the output schema.
Extract raw preferences (books, movies, exercises) and derived traits. 
Do NOT guess MBTI unless the user explicitly stated it.
Output valid JSON only.

Transcript:
${JSON.stringify(transcript, null, 2)}
        `;

        let parsedNode: any = null;
        let retryCount = 0;
        const maxRetries = 1;

        while (retryCount <= maxRetries) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-lite',
                    contents: promptText,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: finalizeSchema,
                        systemInstruction: systemInstruction,
                    }
                });

                parsedNode = JSON.parse(response.text || '{}');
                break; // If parse succeeds, break out of loop
            } catch (err) {
                console.warn(`JSON Parse failed on attempt ${retryCount + 1}`, err);
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
            stage: parsedNode.stage
        };

        // 1. Update interviews table (using admin client)
        const { error: interviewError } = await supabaseAdmin
            .from('interviews')
            .update({
                analysis_json: analysisJson,
                decision: parsedNode.decision,
                absolute_score: parsedNode.absolute_score || parsedNode.score, // Handle dual mapping
                score: parsedNode.score,
                risk_flags: parsedNode.risk_flags,
                summary: parsedNode.summary,
                model_version: 'gemini-2.5-flash'
            })
            .eq('id', interview_id);

        if (interviewError) {
            console.error('Failed to update interview:', interviewError);
            return NextResponse.json({ error: 'DB Update Failed', details: interviewError.message }, { status: 500 });
        }

        // 2. Upsert user_traits table (matching cache)  (using admin client)
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

        return NextResponse.json(parsedNode);

    } catch (error: any) {
        console.error('Interview Finalize Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
