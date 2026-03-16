import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAdmissionApplication } from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

type JsonRecord = Record<string, unknown>;

type PortOneIdentity = {
    status: 'VERIFIED';
    name: string | null;
    birthYear: number | null;
    gender: string | null;
    phone: string | null;
    ci: string;
};

type IdentityVerificationDeps = {
    isTestRouteEnabled: boolean;
    portOneApiSecret?: string;
    fetchImpl?: typeof fetch;
    now?: () => Date;
};

type IdentityVerificationInput = {
    identityVerificationId?: unknown;
    name?: unknown;
    phone?: unknown;
};

type IdentityVerificationResult = {
    status: number;
    payload: JsonRecord;
};

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

export function normalizeName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length >= 2 ? normalized : null;
}

export function normalizePhoneDigits(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
        return null;
    }
    return digits;
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
        ?? identity?.birth_year,
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

async function fetchPortOneIdentity(
    identityVerificationId: string,
    deps: IdentityVerificationDeps,
): Promise<PortOneIdentity | null> {
    if (deps.isTestRouteEnabled && identityVerificationId.startsWith('mock_')) {
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

    if (!deps.portOneApiSecret) {
        throw new Error('Missing PORTONE_API_SECRET');
    }

    const response = await (deps.fetchImpl || fetch)(
        `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
        {
            method: 'GET',
            headers: {
                Authorization: `PortOne ${deps.portOneApiSecret}`,
            },
            cache: 'no-store',
        },
    );

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('PortOne API Error:', response.status, text);
        return null;
    }

    const payload = await response.json().catch(() => null);
    return normalizePortOneIdentity(payload);
}

function errorResult(
    status: number,
    code: string,
    message: string,
): IdentityVerificationResult {
    return {
        status,
        payload: {
            error: {
                code,
                message,
            },
        },
    };
}

export async function verifyIdentityForUser(
    admin: SupabaseClient,
    userId: string,
    input: IdentityVerificationInput,
    deps: IdentityVerificationDeps,
): Promise<IdentityVerificationResult> {
    const identityVerificationId = typeof input.identityVerificationId === 'string'
        ? input.identityVerificationId
        : '';
    const requestedName = normalizeName(input.name);
    const requestedPhone = normalizePhoneDigits(input.phone);

    if (!identityVerificationId) {
        return errorResult(400, 'BAD_REQUEST', 'Missing verification ID');
    }

    if (input.name !== undefined && !requestedName) {
        return errorResult(400, 'BAD_REQUEST', 'Invalid name format');
    }

    if (input.phone !== undefined && !requestedPhone) {
        return errorResult(400, 'BAD_REQUEST', 'Invalid phone format');
    }

    let portOneData: PortOneIdentity | null;
    try {
        portOneData = await fetchPortOneIdentity(identityVerificationId, deps);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'PORTONE_UNKNOWN_ERROR';
        if (message.includes('PORTONE_API_SECRET')) {
            return errorResult(500, 'SERVER_MISCONFIG', 'Missing PORTONE_API_SECRET');
        }
        throw error;
    }

    if (!portOneData || portOneData.status !== 'VERIFIED') {
        return errorResult(400, 'PORTONE_VERIFICATION_FAILED', 'PortOne identity not verified.');
    }

    if (requestedName && portOneData.name) {
        const normalizedPortOneName = normalizeName(portOneData.name);
        if (normalizedPortOneName && normalizedPortOneName !== requestedName) {
            return errorResult(400, 'NAME_MISMATCH', 'Input name does not match verified identity.');
        }
    }

    if (requestedPhone && portOneData.phone) {
        const normalizedPortOnePhone = normalizePhoneDigits(portOneData.phone);
        if (normalizedPortOnePhone && normalizedPortOnePhone !== requestedPhone) {
            return errorResult(400, 'PHONE_MISMATCH', 'Input phone does not match verified identity.');
        }
    }

    const ciHash = crypto.createHash('sha256').update(portOneData.ci).digest('hex');
    const nameHash = portOneData.name
        ? crypto.createHash('sha256').update(portOneData.name).digest('hex')
        : null;
    const phoneEncrypted = portOneData.phone
        ? crypto.createHash('sha256').update(portOneData.phone).digest('hex')
        : null;

    const { data: existingClaim } = await admin
        .from('identity_claims')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!existingClaim) {
        const { error: claimsErr } = await admin
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
            return errorResult(500, 'CLAIMS_INSERT_FAILED', 'Failed to save identity claim');
        }
    }

    const profilePatch: {
        verified: boolean;
        birth_year?: number | null;
        gender?: string | null;
        display_name?: string;
    } = { verified: true };
    if (portOneData.birthYear !== null) {
        profilePatch.birth_year = portOneData.birthYear;
    }
    if (portOneData.gender) {
        profilePatch.gender = portOneData.gender;
    }
    const displayName = requestedName || normalizeName(portOneData.name);
    if (displayName) {
        profilePatch.display_name = displayName;
    }

    const { error: profilesErr } = await admin
        .from('profiles')
        .update(profilePatch)
        .eq('id', userId);

    if (profilesErr) {
        return errorResult(500, 'PROFILES_UPDATE_FAILED', 'Failed to update user profile');
    }

    const nowIso = (deps.now || (() => new Date()))().toISOString();
    const { application } = await ensureAdmissionApplication(admin, userId);
    const { error: appUpdateError } = await admin
        .from('admission_applications')
        .update({
            status: 'IN_PROGRESS',
            current_step: 'LIVENESS',
        })
        .eq('id', application.id);

    if (appUpdateError) {
        return errorResult(500, 'APPLICATION_UPDATE_FAILED', appUpdateError.message);
    }

    await writeTrustLedgerEvent(admin, {
        userId,
        applicationId: application.id,
        eventType: 'IDENTITY_VERIFIED',
        payload: {
            identity_verification_id: identityVerificationId,
            verified_at: nowIso,
        },
    });

    return {
        status: 200,
        payload: {
            success: true,
            message: 'Identity locked successfully.',
            receipt_id: userId,
            verified: true,
        },
    };
}
