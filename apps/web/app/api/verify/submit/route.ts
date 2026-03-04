import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseEnv() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
        throw new Error('Missing Supabase env');
    }
    return { supabaseUrl, anonKey, serviceKey };
}

type VerifySubmitBody = {
    verification_id?: unknown;
};

type VerificationRow = {
    id: string;
    user_id: string;
    status: 'PENDING' | 'AI_VERIFIED' | 'VERIFIED' | 'REJECTED';
    type: string;
    artifact_object_key: string | null;
    extracted_value: unknown;
};

type ScanResult = {
    hasPii: boolean;
    reason?: string;
    confidence: number;
    extracted: Record<string, unknown>;
};

function normalizeText(buffer: Buffer): string {
    return buffer.toString('utf8').replace(/\u0000/g, ' ');
}

function runHeuristicScan(buffer: Buffer, verificationType: string): ScanResult {
    const text = normalizeText(buffer);
    const hasRRNDash = /\b\d{6}-\d{7}\b/.test(text);
    const hasRRNCompact = /\b\d{13}\b/.test(text);
    const hasPii = hasRRNDash || hasRRNCompact;
    if (hasPii) {
        return {
            hasPii: true,
            reason: 'RRN_PATTERN_DETECTED',
            confidence: 1,
            extracted: {},
        };
    }

    return {
        hasPii: false,
        confidence: 0.6,
        extracted: {
            parser: 'heuristic_v1',
            verification_type: verificationType,
            file_size_bytes: buffer.length,
            pii_scan: 'clear',
        },
    };
}

async function resolveUserIdFromRequest(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
    const cookieStore = await cookies();
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    const supabaseAuth = authHeader
        ? createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        : createServerClient(supabaseUrl, anonKey, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // read-only flow
                },
            },
        });

    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) {
        return null;
    }
    return user.id;
}

export async function POST(req: Request) {
    try {
        const { supabaseUrl, anonKey, serviceKey } = getSupabaseEnv();
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);

        const userId = await resolveUserIdFromRequest(req, supabaseUrl, anonKey);
        if (!userId) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }, details: {} },
                { status: 401 },
            );
        }

        const body = await req.json().catch(() => ({})) as VerifySubmitBody;
        const verificationId = typeof body.verification_id === 'string' ? body.verification_id : '';
        if (!verificationId) {
            return NextResponse.json(
                { error: { code: 'BAD_REQUEST', message: 'Missing verification_id' }, details: {} },
                { status: 400 },
            );
        }

        const { data: verification, error: verificationErr } = await supabaseAdmin
            .from('verifications')
            .select('id,user_id,status,type,artifact_object_key,extracted_value')
            .eq('id', verificationId)
            .maybeSingle<VerificationRow>();

        if (verificationErr) {
            return NextResponse.json(
                { error: { code: 'LOOKUP_FAILED', message: verificationErr.message }, details: {} },
                { status: 500 },
            );
        }
        if (!verification) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'Verification not found' }, details: {} },
                { status: 404 },
            );
        }
        if (verification.user_id !== userId) {
            return NextResponse.json(
                { error: { code: 'FORBIDDEN', message: 'Not owner' }, details: {} },
                { status: 403 },
            );
        }

        if (verification.status === 'VERIFIED' || verification.status === 'REJECTED') {
            return NextResponse.json(
                {
                    success: true,
                    status: verification.status,
                    message: 'Verification already finalized.',
                },
            );
        }

        if (!verification.artifact_object_key) {
            return NextResponse.json(
                {
                    error: { code: 'ARTIFACT_MISSING', message: 'artifact_object_key is missing' },
                    details: {},
                },
                { status: 400 },
            );
        }

        const { data: fileData, error: fileErr } = await supabaseAdmin
            .storage
            .from('verification-artifacts')
            .download(verification.artifact_object_key);

        if (fileErr || !fileData) {
            return NextResponse.json(
                {
                    error: { code: 'ARTIFACT_DOWNLOAD_FAILED', message: fileErr?.message || 'Artifact not found' },
                    details: {},
                },
                { status: 400 },
            );
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const scan = runHeuristicScan(buffer, verification.type);

        if (scan.hasPii) {
            const { error: rejectErr } = await supabaseAdmin
                .from('verifications')
                .update({
                    status: 'REJECTED',
                    admin_note: 'Auto-Reject: PII (RRN) detected in document.',
                })
                .eq('id', verificationId);

            if (rejectErr) {
                return NextResponse.json(
                    { error: { code: 'UPDATE_FAILED', message: rejectErr.message }, details: {} },
                    { status: 500 },
                );
            }

            return NextResponse.json(
                {
                    error: {
                        code: 'PII_DETECTED',
                        message: 'Extremely sensitive PII (RRN) detected. File rejected immediately.',
                    },
                    details: { reason: scan.reason || 'RRN_PATTERN_DETECTED' },
                },
                { status: 400 },
            );
        }

        const currentExtracted = verification.extracted_value && typeof verification.extracted_value === 'object'
            ? verification.extracted_value as Record<string, unknown>
            : {};

        const nextExtracted = {
            ...currentExtracted,
            ...scan.extracted,
        };

        const { error: verifyErr } = await supabaseAdmin
            .from('verifications')
            .update({
                status: 'AI_VERIFIED',
                extracted_value: nextExtracted,
                ai_confidence: scan.confidence,
                admin_note: null,
            })
            .eq('id', verificationId);

        if (verifyErr) {
            return NextResponse.json(
                { error: { code: 'UPDATE_FAILED', message: verifyErr.message }, details: {} },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            status: 'AI_VERIFIED',
            message: 'Artifact scanned successfully. Awaiting admin review.',
            verification_id: verificationId,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal error';
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message }, details: {} },
            { status: 500 },
        );
    }
}
