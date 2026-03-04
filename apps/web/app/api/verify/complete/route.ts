import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role to bypass RLS for identity_claims insert
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mock PortOne Fetch (for v1.1 execution)
async function mockFetchPortOneIdentity(identityVerificationId: string) {
    if (identityVerificationId === 'mock_fail') return null;
    return {
        status: 'VERIFIED',
        name: '홍길동',
        birthYear: 1990,
        gender: 'MALE',
        phone: '01012345678',
        ci: 'abcdefg1234567890ci'
    };
}

export async function POST(req: Request) {
    try {
        const { identityVerificationId } = await req.json();

        if (!identityVerificationId) {
            return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing verification ID' } }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet: any[]) { },
            },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
        }

        const user_id = user.id;

        // 1. Fetch from PortOne (Mocked for Phase 1.1)
        const portOneData = await mockFetchPortOneIdentity(identityVerificationId);

        if (!portOneData || portOneData.status !== 'VERIFIED') {
            return NextResponse.json({ error: { code: 'PORTONE_VERIFICATION_FAILED', message: 'PortOne identity not verified.' } }, { status: 400 });
        }

        // 2. Hash sensitive PII
        const ci_hash = crypto.createHash('sha256').update(portOneData.ci).digest('hex');
        const name_hash = crypto.createHash('sha256').update(portOneData.name).digest('hex');
        const phone_encrypted = crypto.createHash('sha256').update(portOneData.phone).digest('hex'); // Stub for encryption

        // 3. INSERT into identity_claims (Immutable)
        const { data: claim, error: claimsErr } = await supabaseAdmin
            .from('identity_claims')
            .upsert({
                user_id,
                name_hash,
                birth_year: portOneData.birthYear,
                gender: portOneData.gender,
                phone_encrypted,
                ci_hash,
                identity_verification_id: identityVerificationId
            })
            .select('user_id')
            .single();

        if (claimsErr) {
            console.error('Identity Claims Insert Error:', claimsErr);
            return NextResponse.json({ error: { code: 'CLAIMS_INSERT_FAILED', message: 'Failed to save identity claim' } }, { status: 500 });
        }

        // 4. Update profiles Additive fields
        const { error: profilesErr } = await supabaseAdmin.from('profiles').update({
            is_verified: true,
            birth_year: portOneData.birthYear,
            gender: portOneData.gender
        }).eq('id', user_id);

        if (profilesErr) {
            console.error('Profiles Update Error:', profilesErr);
            return NextResponse.json({ error: { code: 'PROFILES_UPDATE_FAILED', message: 'Failed to update user profile' } }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Identity Locked successfully.',
            receipt_id: claim.user_id,
            is_verified: true
        });

    } catch (e: any) {
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
    }
}
