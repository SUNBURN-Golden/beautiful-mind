import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'hello',
    });
    console.log('SUCCESS:', result.text);
} catch (e) {
    console.error('ERROR:', e.message);
}
