import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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

type VerifyBody = {
    identityVerificationId?: unknown;
};

type PortOneIdentity = {
    status: 'VERIFIED';
    name: string;
    birthYear: number;
    gender: string;
    phone: string;
    ci: string;
};

async function mockFetchPortOneIdentity(identityVerificationId: string): Promise<PortOneIdentity | null> {
    if (identityVerificationId === 'mock_fail') return null;
    return {
        status: 'VERIFIED',
        name: '홍길동',
        birthYear: 1990,
        gender: 'MALE',
        phone: '01012345678',
        ci: 'abcdefg1234567890ci',
    };
}

export async function POST(req: Request) {
    try {
        const { supabaseUrl, anonKey, serviceKey } = getSupabaseEnv();
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const body = await req.json().catch(() => ({})) as VerifyBody;
        const identityVerificationId = typeof body.identityVerificationId === 'string'
            ? body.identityVerificationId
            : '';

        if (!identityVerificationId) {
            return NextResponse.json(
                { error: { code: 'BAD_REQUEST', message: 'Missing verification ID' } },
                { status: 400 },
            );
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(supabaseUrl, anonKey, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // no-op for read-only auth flow
                },
            },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
                { status: 401 },
            );
        }

        const userId = user.id;

        // 1. Fetch from PortOne (Mocked for Phase 1.1)
        const portOneData = await mockFetchPortOneIdentity(identityVerificationId);
        if (!portOneData || portOneData.status !== 'VERIFIED') {
            return NextResponse.json(
                { error: { code: 'PORTONE_VERIFICATION_FAILED', message: 'PortOne identity not verified.' } },
                { status: 400 },
            );
        }

        // 2. Hash sensitive PII
        const ciHash = crypto.createHash('sha256').update(portOneData.ci).digest('hex');
        const nameHash = crypto.createHash('sha256').update(portOneData.name).digest('hex');
        const phoneEncrypted = crypto.createHash('sha256').update(portOneData.phone).digest('hex'); // Stub for encryption

        // 3. INSERT into identity_claims (insert-only, immutable table)
        const { data: existingClaim } = await supabaseAdmin
            .from('identity_claims')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingClaim) {
            const { error: claimsErr } = await supabaseAdmin
                .from('identity_claims')
                .insert({
                    user_id: userId,
                    name_hash: nameHash,
                    birth_year: portOneData.birthYear,
                    gender: portOneData.gender,
                    phone_encrypted: phoneEncrypted,
                    ci_hash: ciHash,
                    identity_verification_id: identityVerificationId,
                });

            if (claimsErr && claimsErr.code !== '23505') {
                console.error('Identity Claims Insert Error:', claimsErr);
                return NextResponse.json(
                    { error: { code: 'CLAIMS_INSERT_FAILED', message: 'Failed to save identity claim' } },
                    { status: 500 },
                );
            }
        }

        // 4. Update profiles additive fields (SSOT uses profiles.verified)
        const { error: profilesErr } = await supabaseAdmin
            .from('profiles')
            .update({
                verified: true,
                birth_year: portOneData.birthYear,
                gender: portOneData.gender,
            })
            .eq('id', userId);

        if (profilesErr) {
            console.error('Profiles Update Error:', profilesErr);
            return NextResponse.json(
                { error: { code: 'PROFILES_UPDATE_FAILED', message: 'Failed to update user profile' } },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Identity locked successfully.',
            receipt_id: userId,
            verified: true,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'INTERNAL_ERROR';
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message } },
            { status: 500 },
        );
    }
}
