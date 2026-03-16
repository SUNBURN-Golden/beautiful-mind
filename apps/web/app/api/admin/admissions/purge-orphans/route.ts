import { NextResponse } from 'next/server';
import { getServiceRoleClient, hasValidCronSecret } from '@/lib/server/trust';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

type PurgeCandidate = {
    id: string;
    user_id: string;
    admission_application_id: string;
    file_storage_key_ephemeral: string | null;
};

export async function POST(req: Request) {
    try {
        if (!hasValidCronSecret(req)) {
            return NextResponse.json({ error: 'FORBIDDEN' }, { status: 401 });
        }

        const admin = getServiceRoleClient();
        const cutoffIso = new Date(Date.now() - (1000 * 60 * 60 * 12)).toISOString();
        const nowIso = new Date().toISOString();

        const { data: candidates, error: listError } = await admin
            .from('admission_document_submissions')
            .select('id,user_id,admission_application_id,file_storage_key_ephemeral')
            .is('purged_at', null)
            .not('file_storage_key_ephemeral', 'is', null)
            .lte('uploaded_at', cutoffIso)
            .returns<PurgeCandidate[]>();

        if (listError) {
            return NextResponse.json(
                { error: 'PURGE_LOOKUP_FAILED', message: listError.message },
                { status: 500 },
            );
        }

        const rows = candidates || [];
        if (rows.length === 0) {
            return NextResponse.json({ success: true, purged_count: 0 });
        }

        const keys = rows
            .map((row) => row.file_storage_key_ephemeral)
            .filter((value): value is string => typeof value === 'string' && value.length > 0);

        if (keys.length > 0) {
            const { error: storageError } = await admin
                .storage
                .from('verification-artifacts')
                .remove(keys);

            if (storageError) {
                return NextResponse.json(
                    { error: 'STORAGE_PURGE_FAILED', message: storageError.message },
                    { status: 500 },
                );
            }
        }

        const ids = rows.map((row) => row.id);
        const { error: updateError } = await admin
            .from('admission_document_submissions')
            .update({
                upload_status: 'PURGED',
                file_storage_key_ephemeral: null,
                purged_at: nowIso,
            })
            .in('id', ids);

        if (updateError) {
            return NextResponse.json(
                { error: 'PURGE_MARK_FAILED', message: updateError.message },
                { status: 500 },
            );
        }

        for (const row of rows) {
            await writeTrustLedgerEvent(admin, {
                userId: row.user_id,
                applicationId: row.admission_application_id,
                eventType: 'ORPHAN_DOCUMENT_PURGED',
                payload: {
                    submission_id: row.id,
                    purged_at: nowIso,
                },
            });
        }

        return NextResponse.json({
            success: true,
            purged_count: rows.length,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
