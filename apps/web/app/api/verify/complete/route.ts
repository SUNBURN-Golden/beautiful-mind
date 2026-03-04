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

type JsonRecord = Record<string, unknown>;

type PortOneIdentity = {
    status: 'VERIFIED';
    name: string | null;
    birthYear: number | null;
    gender: string | null;
    phone: string | null;
    ci: string;
};

function isTestModeEnabled(): boolean {
    return (
        process.env.ALLOW_TEST_API_ROUTES === 'true'
        || process.env.NEXT_PUBLIC_ALLOW_TEST_FEATURES === 'true'
    );
}

function asObject(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object') {
        return null;
    }
    return value as JsonRecord;
}

function pickString(values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }
    }
    return null;
}

function normalizeBirthYear(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.floor(value);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}

function normalizePortOneIdentity(payload: unknown): PortOneIdentity | null {
    const root = asObject(payload);
    if (!root) return null;

    const verifiedCustomer = asObject(root.verifiedCustomer);
    const customer = asObject(root.customer);
    const identity = asObject(root.identity);

    const statusRaw = pickString([
        root.status,
        verifiedCustomer?.status,
        customer?.status,
    ]);
    if ((statusRaw || '').toUpperCase() !== 'VERIFIED') {
        return null;
    }

    const ci = pickString([
        root.ci,
        root.identityKey,
        root.identity_unique_key,
        verifiedCustomer?.ci,
        customer?.ci,
        identity?.ci,
    ]);
    if (!ci) {
        return null;
    }

    const name = pickString([
        root.name,
        verifiedCustomer?.name,
        customer?.name,
        identity?.name,
    ]);

    const birthYear = normalizeBirthYear(
        root.birthYear
        ?? root.birth_year
        ?? verifiedCustomer?.birthYear
        ?? verifiedCustomer?.birth_year
        ?? customer?.birthYear
        ?? customer?.birth_year
        ?? identity?.birthYear
        ?? identity?.birth_year
    );

    const gender = pickString([
        root.gender,
        verifiedCustomer?.gender,
        customer?.gender,
        identity?.gender,
    ]);

    const phone = pickString([
        root.phone,
        root.phoneNumber,
        verifiedCustomer?.phone,
        verifiedCustomer?.phoneNumber,
        customer?.phone,
        customer?.phoneNumber,
        identity?.phone,
        identity?.phoneNumber,
    ]);

    return {
        status: 'VERIFIED',
        name,
        birthYear,
        gender,
        phone,
        ci,
    };
}

async function fetchPortOneIdentity(identityVerificationId: string): Promise<PortOneIdentity | null> {
    if (isTestModeEnabled() && identityVerificationId.startsWith('mock_')) {
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

    const portOneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portOneApiSecret) {
        throw new Error('Missing PORTONE_API_SECRET');
    }

    const response = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
        method: 'GET',
        headers: {
            Authorization: `PortOne ${portOneApiSecret}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('PortOne API Error:', response.status, text);
        return null;
    }

    const payload = await response.json().catch(() => null);
    return normalizePortOneIdentity(payload);
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

        let portOneData: PortOneIdentity | null = null;
        try {
            portOneData = await fetchPortOneIdentity(identityVerificationId);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'PORTONE_UNKNOWN_ERROR';
            if (message.includes('PORTONE_API_SECRET')) {
                return NextResponse.json(
                    { error: { code: 'SERVER_MISCONFIG', message: 'Missing PORTONE_API_SECRET' } },
                    { status: 500 },
                );
            }
            throw error;
        }

        if (!portOneData || portOneData.status !== 'VERIFIED') {
            return NextResponse.json(
                { error: { code: 'PORTONE_VERIFICATION_FAILED', message: 'PortOne identity not verified.' } },
                { status: 400 },
            );
        }

        const ciHash = crypto.createHash('sha256').update(portOneData.ci).digest('hex');
        const nameHash = portOneData.name
            ? crypto.createHash('sha256').update(portOneData.name).digest('hex')
            : null;
        const phoneEncrypted = portOneData.phone
            ? crypto.createHash('sha256').update(portOneData.phone).digest('hex')
            : null;

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

        const profilePatch: {
            verified: boolean;
            birth_year?: number | null;
            gender?: string | null;
        } = { verified: true };
        if (portOneData.birthYear !== null) {
            profilePatch.birth_year = portOneData.birthYear;
        }
        if (portOneData.gender) {
            profilePatch.gender = portOneData.gender;
        }

        const { error: profilesErr } = await supabaseAdmin
            .from('profiles')
            .update(profilePatch)
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
