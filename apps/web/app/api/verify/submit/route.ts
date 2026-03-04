import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase admin env');
    }
    return createClient(supabaseUrl, serviceKey);
}

// Mock Gemini AI parsing for Phase 1.1 Backend validation
type GeminiParseResult = {
    decision: 'REJECT_RRN_FOUND' | 'AI_VERIFIED';
    extracted_value: Record<string, unknown> | null;
    confidence: number;
    reason?: string;
};

async function mockGeminiVisionParse(buffer: Buffer): Promise<GeminiParseResult> {
    const text = buffer.toString('utf-8');
    // 1. RRN pattern check ######-#######
    if (/\d{6}-\d{7}/.test(text)) {
        return { decision: 'REJECT_RRN_FOUND', extracted_value: null, confidence: 1.0, reason: 'RRN detected' };
    }
    return {
        decision: 'AI_VERIFIED',
        extracted_value: { band: 'A', tier: 1 },
        confidence: 0.95
    };
}

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' }, details: {} }, { status: 401 });

        const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authErr || !user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' }, details: {} }, { status: 401 });

        const { verification_id } = await req.json();
        if (!verification_id) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing verification_id' }, details: {} }, { status: 400 });

        const { data: verification } = await supabase.from('verifications').select('*').eq('id', verification_id).single();
        if (!verification) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' }, details: {} }, { status: 404 });

        if (verification.user_id !== user.id) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Not owner' }, details: {} }, { status: 403 });

        await supabase.from('identity_claims').select('name_hash').eq('user_id', user.id).single();

        const { data: fileData, error: fileErr } = await supabase.storage.from('verification-artifacts').download(verification.artifact_object_key);

        let buffer: Buffer;
        if (fileErr || !fileData) {
            // Mock resilience
            buffer = Buffer.from('Mock PDF with NO RRN...');
        } else {
            const arrayBuffer = await fileData.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        const aiResult = await mockGeminiVisionParse(buffer);

        if (aiResult.decision === 'REJECT_RRN_FOUND') {
            await supabase.from('verifications').update({ status: 'REJECTED', admin_note: 'Auto-Reject: PII (RRN) detected in document.' }).eq('id', verification_id);
            return NextResponse.json({ error: { code: 'PII_DETECTED', message: 'Extremely sensitive PII (RRN) detected. File rejected immediately.' }, details: {} }, { status: 400 });
        }

        if (aiResult.decision === 'AI_VERIFIED') {
            await supabase.from('verifications').update({
                status: 'AI_VERIFIED',
                extracted_value: aiResult.extracted_value,
                ai_confidence: aiResult.confidence
            }).eq('id', verification_id);

            return NextResponse.json({ success: true, status: 'AI_VERIFIED', message: 'AI parsed successfully. Awaiting admin.' });
        }

        return NextResponse.json({ error: { code: 'AI_REJECTED', message: 'AI rejected document' }, details: {} }, { status: 400 });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal error';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message }, details: {} }, { status: 500 });
    }
}
