import { writeTrustLedgerEvent } from '../admission-events.ts';
import type {
    AdminClient,
    AdmissionDecisionActor,
    AdmissionDocumentRow,
} from './types';

export async function purgeArtifacts(
    admin: AdminClient,
    docs: AdmissionDocumentRow[],
    params: { userId: string; applicationId: string },
): Promise<number> {
    const keys = docs
        .map((row) => row.file_storage_key_ephemeral)
        .filter((value): value is string => typeof value === 'string' && value.length > 0);

    if (keys.length === 0) return 0;

    const { error } = await admin.storage.from('verification-artifacts').remove(keys);
    if (error) {
        await writeTrustLedgerEvent(admin, {
            userId: params.userId,
            applicationId: params.applicationId,
            eventType: 'PURGE_FAILED',
            payload: {
                message: error.message,
                key_count: keys.length,
                failed_at: new Date().toISOString(),
            },
        });
        throw new Error(`Artifact purge failed: ${error.message}`);
    }

    return keys.length;
}

export async function markDocumentsPurged(
    admin: AdminClient,
    docs: AdmissionDocumentRow[],
    buildPatch: (doc: AdmissionDocumentRow) => Record<string, unknown>,
): Promise<void> {
    for (const doc of docs) {
        await admin
            .from('admission_document_submissions')
            .update(buildPatch(doc))
            .eq('id', doc.id);
    }
}

export async function writeRawPurgeLedgerEvent(
    admin: AdminClient,
    params: {
        userId: string;
        applicationId: string;
        source: AdmissionDecisionActor['source'];
        decisionRunId: string;
        purgedCount: number;
        nowIso: string;
        soulCredentialId?: string | null;
    },
): Promise<void> {
    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        soulCredentialId: params.soulCredentialId || null,
        eventType: 'RAW_DOCUMENTS_PURGED',
        payload: {
            source: params.source,
            decision_run_id: params.decisionRunId,
            purged_count: params.purgedCount,
            purged_at: params.nowIso,
        },
    });
}
