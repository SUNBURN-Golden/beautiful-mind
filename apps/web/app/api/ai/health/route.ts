import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function GET() {
    try {
        const ai = getGeminiClient();

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Return a simple JSON object with a single key 'status' and value 'ok'.",
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            }
        });

        const text = response.text || '';
        const parsed: unknown = JSON.parse(text);

        return NextResponse.json({
            status: 200,
            message: 'Gemini API Key is valid and operational.',
            data: parsed
        });
    } catch (e: unknown) {
        const status = (
            typeof e === 'object'
            && e !== null
            && 'status' in e
            && typeof (e as { status?: unknown }).status === 'number'
        )
            ? (e as { status: number }).status
            : 500;
        const message = (
            typeof e === 'object'
            && e !== null
            && 'message' in e
            && typeof (e as { message?: unknown }).message === 'string'
        )
            ? (e as { message: string }).message
            : 'Unknown error';

        return NextResponse.json({
            status,
            message: 'Gemini API Key validation failed.',
            error: message
        }, { status });
    }
}
