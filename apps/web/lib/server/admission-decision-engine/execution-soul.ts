import { buildAttestationHash } from '../admission-core.ts';
import type {
    AdminClient,
    AdmissionDecisionActor,
} from './types';

export async function issueSoulCredential(
    admin: AdminClient,
    params: {
        applicationId: string;
        userId: string;
        decisionRunId: string;
        source: AdmissionDecisionActor['source'];
        nowIso: string;
        actorRole: string;
    },
): Promise<string> {
    const { data: soul, error: soulError } = await admin
        .from('soul_credentials')
        .upsert({
            user_id: params.userId,
            admission_application_id: params.applicationId,
            credential_type: 'SOUL_TRUST',
            trust_level: 'ADMISSION_VERIFIED',
            status: 'ISSUED',
            issued_at: params.nowIso,
            revoked_at: null,
            attestation_hash: buildAttestationHash(params.userId, 'SOUL_TRUST', {
                admission_application_id: params.applicationId,
                decision_run_id: params.decisionRunId,
                source: params.source,
            }),
            metadata: {
                issuance_source: params.source,
                decision_run_id: params.decisionRunId,
                actor_role: params.actorRole,
            },
        }, { onConflict: 'user_id' })
        .select('id')
        .single();

    if (soulError || !soul) {
        throw new Error(soulError?.message || 'Failed to issue soul credential');
    }

    const { data: activeAdmissionClaim } = await admin
        .from('sbt_claims')
        .select('id')
        .eq('user_id', params.userId)
        .eq('claim_type', 'ADMISSION_SOUL')
        .in('status', ['ACTIVE', 'PENDING', 'FROZEN'])
        .maybeSingle();

    if (!activeAdmissionClaim) {
        await admin.from('sbt_claims').insert({
            user_id: params.userId,
            claim_type: 'ADMISSION_SOUL',
            trust_level: 'HIGH',
            status: 'ACTIVE',
            issuer: params.source === 'AI_RULE_ENGINE' ? 'AUDIT' : 'ADMIN',
            claim_payload: {
                source: params.source,
                decision_run_id: params.decisionRunId,
            },
            issued_at: params.nowIso,
        });
    }

    return soul.id;
}
