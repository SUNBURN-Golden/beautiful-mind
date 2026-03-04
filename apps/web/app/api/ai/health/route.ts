import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ status: 500, message: 'GEMINI_API_KEY is not set in environment variables.' }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Return a simple JSON object with a single key 'status' and value 'ok'.",
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);

        return NextResponse.json({
            status: 200,
            message: 'Gemini API Key is valid and operational.',
            data: parsed,
            usedKey: `${apiKey.substring(0, 5)}...${apiKey.slice(-5)}`
        });
    } catch (e: any) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        return NextResponse.json({
            status: e.status || 500,
            message: 'Gemini API Key validation failed.',
            error: e.message,
            usedKey: apiKey ? `${apiKey.substring(0, 5)}...${apiKey.slice(-5)}` : 'none'
        }, { status: e.status || 500 });
    }
}
