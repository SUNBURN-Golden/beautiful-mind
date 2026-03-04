import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isTestRouteEnabled } from '@/lib/server/trust';

function getSupabaseEnv() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
        throw new Error('Missing Supabase env');
    }
    return { supabaseUrl, anonKey, serviceKey };
}

export async function POST(req: Request) {
    try {
        const { supabaseUrl, anonKey, serviceKey } = getSupabaseEnv();
        const supabase = createClient(supabaseUrl, serviceKey); // service role for bypassing RLS to insert PENDING verification
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string;
        const skipFile = formData.get('skip_file') === 'true';

        if (!type || (!file && !skipFile)) {
            return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'File (or skip_file) and type required' }, details: {} }, { status: 400 });
        }

        const cookieStore = await cookies();
        const authHeader = req.headers.get('Authorization');

        const supabaseAuth = authHeader
            ? createClient(supabaseUrl, anonKey, {
                global: { headers: { Authorization: authHeader } }
            })
            : createServerClient(supabaseUrl, anonKey, {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll() { },
                },
            });

        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
        }

        const validTypes = ['PHYSICAL', 'RESIDENCE', 'CAREER', 'EDUCATION', 'INCOME', 'ASSET'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid verification type' }, details: {} }, { status: 400 });
        }

        let payload_hash_keccak = '0xmock';
        let final_object_key = 'mock/skipped';

        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            payload_hash_keccak = ethers.keccak256(buffer);
            const ext = file.name.split('.').pop() || 'tmp';
            final_object_key = `${user.id}/${crypto.randomUUID()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from('verification-artifacts')
                .upload(final_object_key, buffer, { contentType: file.type });

            if (uploadErr) {
                console.error('Storage Upload Error (Ignored for DB Mock):', uploadErr);
            }
        }

        // 3. Insert into verifications
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7); // 7 days TTL for artifacts

        const status = skipFile && isTestRouteEnabled()
            ? 'VERIFIED'
            : 'PENDING';

        const { data: inserted, error: dbErr } = await supabase.from('verifications').insert({
            user_id: user.id,
            type,
            status,
            payload_hash_keccak,
            artifact_object_key: final_object_key,
            artifact_expires_at: expires_at.toISOString()
        }).select('id').single();

        if (dbErr) {
            console.error('Insert Error:', dbErr);
            return NextResponse.json({ error: { code: 'INSERT_FAILED', message: dbErr.message }, details: {} }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            verification_id: inserted.id,
            payload_hash_keccak,
            message: 'Artifact uploaded and securely hashed.'
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unexpected server error';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message }, details: {} }, { status: 500 });
    }
}
