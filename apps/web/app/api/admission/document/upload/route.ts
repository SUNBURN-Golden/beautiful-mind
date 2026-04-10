import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import {
    ensureAdmissionApplication,
    isAdmissionDocumentType,
} from '@/lib/server/admission-core';
import { getMissingContracts } from '@/lib/server/contracts';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

function extensionFromFilename(filename: string): string {
    const split = filename.split('.');
    if (split.length < 2) return 'bin';
    return split.pop()?.toLowerCase() || 'bin';
}

function isAllowedDocumentUpload(file: File): boolean {
    const allowedMime = new Set([
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
    ]);
    const allowedExt = new Set(['pdf', 'jpg', 'jpeg', 'png']);
    const ext = extensionFromFilename(file.name);
    return allowedMime.has(file.type) || allowedExt.has(ext);
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const documentTypeRaw = formData.get('document_type');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'file is required' }, { status: 400 });
        }

        if (typeof documentTypeRaw !== 'string' || !isAdmissionDocumentType(documentTypeRaw)) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'invalid document_type' }, { status: 400 });
        }

        if (!isAllowedDocumentUpload(file)) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'Only PDF/JPG/JPEG/PNG files are allowed.' },
                { status: 400 },
            );
        }

        const admin = getServiceRoleClient();

        const { data: identity } = await admin
            .from('identity_claims')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!identity) {
            return NextResponse.json(
                { error: 'IDENTITY_REQUIRED', message: 'Identity verification is required before document upload.' },
                { status: 409 },
            );
        }

        const { application } = await ensureAdmissionApplication(admin, user.id);

        if (!application.liveness_verified_at) {
            return NextResponse.json(
                { error: 'LIVENESS_REQUIRED', message: 'Liveness verification is required before document upload.' },
                { status: 409 },
            );
        }

        const missingContracts = await getMissingContracts(user.id, admin);
        if (missingContracts.length > 0) {
            return NextResponse.json(
                {
                    error: 'CONSENTS_REQUIRED',
                    message: 'All required admission contracts must be signed before document upload.',
                    missing_contracts: missingContracts,
                    // Compatibility alias for older callers that still inspect missing_consents.
                    missing_consents: missingContracts,
                },
                { status: 409 },
            );
        }

        if (application.status === 'ACTIVE') {
            return NextResponse.json(
                { error: 'ALREADY_ACTIVE', message: 'Admission is already active.' },
                { status: 409 },
            );
        }

        if (['APPEAL_PENDING', 'AUDIT_REVIEW'].includes(application.status)) {
            return NextResponse.json(
                {
                    error: 'COLD_PATH_IN_PROGRESS',
                    message: `Current status ${application.status} is under cold-path handling.`,
                },
                { status: 409 },
            );
        }

        const { data: existingSubmission } = await admin
            .from('admission_document_submissions')
            .select('id,file_storage_key_ephemeral')
            .eq('admission_application_id', application.id)
            .eq('document_type', documentTypeRaw)
            .maybeSingle();

        if (existingSubmission?.file_storage_key_ephemeral) {
            await admin.storage
                .from('verification-artifacts')
                .remove([existingSubmission.file_storage_key_ephemeral]);
        }

        const nowIso = new Date().toISOString();
        const ext = extensionFromFilename(file.name);
        const objectKey = `admission/${application.id}/${user.id}/${documentTypeRaw}/${randomUUID()}.${ext}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await admin
            .storage
            .from('verification-artifacts')
            .upload(objectKey, fileBuffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json(
                { error: 'UPLOAD_FAILED', message: uploadError.message },
                { status: 500 },
            );
        }

        const payload = {
            admission_application_id: application.id,
            user_id: user.id,
            document_type: documentTypeRaw,
            upload_status: existingSubmission ? 'REPLACED' : 'UPLOADED',
            processing_status: 'PENDING',
            final_result: 'PENDING',
            ai_result: null,
            ai_confidence: null,
            human_result: null,
            extracted_claims_json: {},
            file_storage_key_ephemeral: objectKey,
            uploaded_at: nowIso,
            processed_at: null,
            purged_at: null,
        };

        const { data: submission, error: upsertError } = await admin
            .from('admission_document_submissions')
            .upsert(payload, { onConflict: 'admission_application_id,document_type' })
            .select('id,document_type,upload_status,processing_status,final_result,uploaded_at')
            .single();

        if (upsertError || !submission) {
            return NextResponse.json(
                { error: 'SUBMISSION_UPSERT_FAILED', message: upsertError?.message || 'Failed to save submission' },
                { status: 500 },
            );
        }

        await admin
            .from('admission_applications')
            .update({
                status: 'IN_PROGRESS',
                current_step: 'DOCUMENTS',
            })
            .eq('id', application.id);

        await writeTrustLedgerEvent(admin, {
            userId: user.id,
            applicationId: application.id,
            eventType: 'DOCUMENT_UPLOADED',
            payload: {
                document_type: documentTypeRaw,
                submission_id: submission.id,
                uploaded_at: nowIso,
            },
        });

        return NextResponse.json({
            success: true,
            submission,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
