import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { ai, systemInstruction, nextQuestionSchema } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { interview_id, last_answer, context } = body;

        if (!interview_id || !last_answer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        // 1. Verify consent (must have deep_profiling=true)
        const { data: consent } = await supabase
            .from('consents')
            .select('deep_profiling')
            .eq('user_id', user.id)
            .single();

        if (!consent?.deep_profiling) {
            return NextResponse.json({ error: 'Deep profiling consent required' }, { status: 403 });
        }

        // 2. Fetch the interview and transcript
        const { data: interview } = await supabase
            .from('interviews')
            .select('*')
            .eq('id', interview_id)
            .eq('user_id', user.id)
            .single();

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        // Append user's last answer to transcript
        const transcript = interview.transcript_json || [];
        transcript.push({ role: 'user', content: last_answer });

        // Update DB with the user's answer (using Admin client to bypass RLS UPDATE block)
        await supabaseAdmin
            .from('interviews')
            .update({ transcript_json: transcript })
            .eq('id', interview_id);

        // 3. Generate the next question with Gemini
        // We instruct Gemini to act as the interviewer and ask the next logical deep profiling question.
        const promptText = `
${systemInstruction}
You are an AI deep profiling agent. Your goal is to extract core traits, preferences, and "why" they like those things.
Current context/topic: ${context?.topic || "General Introduction"}
Past transcript:
${JSON.stringify(transcript, null, 2)}

Based on the latest answer, generate the *next* logical question to dig deeper into their personality or transition to a new topic (books, movies, exercise, MBTI if they mention it).
Keep your question conversational but analytical. Output strictly following the provided JSON schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: promptText,
            config: {
                responseMimeType: 'application/json',
                responseSchema: nextQuestionSchema,
                systemInstruction: systemInstruction,
            }
        });

        const resultJsonString = response.text || '{}';
        const parsedNode = JSON.parse(resultJsonString);

        // Append the AI's question to the transcript
        transcript.push({ role: 'assistant', content: parsedNode.next_question });
        await supabaseAdmin
            .from('interviews')
            .update({ transcript_json: transcript })
            .eq('id', interview_id);

        return NextResponse.json(parsedNode);

    } catch (error: any) {
        console.error('Interview Next Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
