import type { SupabaseClient } from '@supabase/supabase-js';
import { RouteServiceError } from './route-service-error';

type ProfileUpdates = {
    height_cm?: number;
    weight_band?: string;
    location_region?: string;
    location_city?: string;
};

type VerificationRow = {
    id: string;
    user_id: string;
    type: string;
    extracted_value: Record<string, unknown> | null;
    artifact_object_key: string | null;
};

export type LegacyVerificationDecision = 'VERIFIED' | 'REJECTED' | 'FRAUD_DOCS';

export type ApplyLegacyVerificationDecisionInput = {
    verificationId: string;
    decision: LegacyVerificationDecision;
    tier?: unknown;
    band?: unknown;
    adminNote?: unknown;
    reviewerUserId: string;
};

function buildExtractedValue(
    verification: VerificationRow,
    input: ApplyLegacyVerificationDecisionInput,
): Record<string, unknown> {
    const extractedValue = verification.extracted_value && typeof verification.extracted_value === 'object'
        ? verification.extracted_value
        : {};

    if (!input.tier && !input.band) {
        return extractedValue;
    }

    return {
        ...extractedValue,
        ...(input.tier ? { tier: input.tier } : {}),
        ...(input.band ? { band: input.band } : {}),
    };
}

function buildProfileUpdates(
    verification: VerificationRow,
    extractedValue: Record<string, unknown>,
): ProfileUpdates {
    const updates: ProfileUpdates = {};
    if (verification.type === 'PHYSICAL') {
        if (typeof extractedValue.height_cm === 'number') updates.height_cm = extractedValue.height_cm;
        if (typeof extractedValue.band === 'string') updates.weight_band = extractedValue.band;
    } else if (verification.type === 'RESIDENCE') {
        if (typeof extractedValue.region === 'string') updates.location_region = extractedValue.region;
        if (typeof extractedValue.city === 'string') updates.location_city = extractedValue.city;
    }
    return updates;
}

export async function applyLegacyVerificationDecision(
    admin: SupabaseClient,
    input: ApplyLegacyVerificationDecisionInput,
) {
    const { data: verification } = await admin
        .from('verifications')
        .select('*')
        .eq('id', input.verificationId)
        .single<VerificationRow>();

    if (!verification) {
        throw new RouteServiceError('NOT_FOUND', 404, 'Verification not found');
    }

    const extractedValue = buildExtractedValue(verification, input);
    const finalStatus = input.decision === 'FRAUD_DOCS' ? 'REJECTED' : input.decision;
    const finalReason = input.decision === 'FRAUD_DOCS' ? 'FRAUD_DOCS' : null;
    const adminNote = typeof input.adminNote === 'string' ? input.adminNote : undefined;

    await admin
        .from('verifications')
        .update({
            status: finalStatus,
            adjudication_reason: finalReason,
            extracted_value: extractedValue,
            admin_note: adminNote,
            reviewed_by: input.reviewerUserId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

    if (input.decision === 'VERIFIED') {
        const updates = buildProfileUpdates(verification, extractedValue);
        if (Object.keys(updates).length > 0) {
            await admin
                .from('profiles')
                .update(updates)
                .eq('id', verification.user_id);
        }
    } else if (input.decision === 'FRAUD_DOCS') {
        await admin
            .from('profiles')
            .update({ banned: true })
            .eq('id', verification.user_id);

        const { error: slashErr, data: slashData } = await admin.rpc('slash_fraud_docs', {
            p_verification_id: input.verificationId,
            p_user_id: verification.user_id,
            p_slash_amount: 1000,
        });

        if (slashErr) console.error('Fraud Slashing Error:', slashErr);
        else console.log('Fraud Slashing SUCCESS:', slashData);
    }

    if (verification.artifact_object_key) {
        await admin.storage.from('verification-artifacts').remove([verification.artifact_object_key]);
    }

    return {
        success: true,
        message: `Verification marked as ${input.decision}, artifact permanently purged.`,
    };
}
