import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMISSION_STAGES, LEGACY_ADMISSION_STAGE_CODES } from '@/lib/contracts/status-stages';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import {
    REQUIRED_DOCUMENT_TYPES,
    ensureAdmissionApplication,
    isAdmissionDocumentType,
    scanAdmissionDocument,
} from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';
import { runAdmissionDecisionEngine } from '@/lib/server/admission-decision-engine/run';

const SubmitSchema = z.object({
    submission_id: z.string().uuid().optional(),
    document_type: z.string().optional(),
    run_auto_decision: z.boolean().optional().default(true),
}).refine((value) => Boolean(value.submission_id || value.document_type), {
    message: 'submission_id or document_type is required',
});

type SubmissionRow = {
    id: string;
    document_type: string;
    upload_status: string;
    processing_status: string;
    final_result: string;
    file_storage_key_ephemeral: string | null;
};

async function downloadAdmissionArtifactWithRetry(
    admin: ReturnType<typeof getServiceRoleClient>,
    objectKey: string,
    maxAttempts = 4,
) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const result = await admin
            .storage
            .from('verification-artifacts')
            .download(objectKey);

        if (result.data) {
            return result;
        }

        if (attempt === maxAttempts) {
            return result;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, attempt * 250);
        });
    }

    return { data: null, error: new Error('Artifact download retries exhausted') };
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = SubmitSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid payload' },
                { status: 400 },
            );
        }

        const admin = getServiceRoleClient();
        const { application } = await ensureAdmissionApplication(admin, user.id);

        let submissionQuery = admin
            .from('admission_document_submissions')
            .select('id,document_type,upload_status,processing_status,final_result,file_storage_key_ephemeral')
            .eq('admission_application_id', application.id)
            .eq('user_id', user.id)
            .limit(1);

        if (parsed.data.submission_id) {
            submissionQuery = submissionQuery.eq('id', parsed.data.submission_id);
        } else {
            const documentType = parsed.data.document_type || '';
            if (!isAdmissionDocumentType(documentType)) {
                return NextResponse.json(
                    { error: 'BAD_REQUEST', message: 'invalid document_type' },
                    { status: 400 },
                );
            }
            submissionQuery = submissionQuery.eq('document_type', documentType);
        }

        const { data: submission, error: submissionError } = await submissionQuery.maybeSingle<SubmissionRow>();
        if (submissionError) {
            return NextResponse.json(
                { error: 'SUBMISSION_LOOKUP_FAILED', message: submissionError.message },
                { status: 500 },
            );
        }

        if (!submission) {
            return NextResponse.json(
                { error: 'SUBMISSION_NOT_FOUND', message: 'Document submission not found' },
                { status: 404 },
            );
        }

        if (!isAdmissionDocumentType(submission.document_type)) {
            return NextResponse.json(
                { error: 'INVALID_DOCUMENT_TYPE', message: 'Unsupported document type in submission' },
                { status: 400 },
            );
        }

        if (!submission.file_storage_key_ephemeral) {
            return NextResponse.json(
                {
                    error: 'ARTIFACT_MISSING',
                    message: 'No file attached to this submission. Upload document first.',
                },
                { status: 409 },
            );
        }

        const { data: fileBlob, error: downloadError } = await downloadAdmissionArtifactWithRetry(
            admin,
            submission.file_storage_key_ephemeral,
        );

        if (downloadError || !fileBlob) {
            return NextResponse.json(
                {
                    error: 'ARTIFACT_DOWNLOAD_FAILED',
                    message: downloadError?.message || 'Document artifact download failed',
                },
                { status: 400 },
            );
        }

        const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
        const aiScan = scanAdmissionDocument(fileBuffer, submission.document_type);
        const nowIso = new Date().toISOString();

        const { error: aiUpdateError } = await admin
            .from('admission_document_submissions')
            .update({
                processing_status: aiScan.processingStatus,
                final_result: aiScan.finalResult,
                ai_result: aiScan.aiResult,
                ai_confidence: aiScan.aiConfidence,
                extracted_claims_json: aiScan.extractedClaims,
                processed_at: nowIso,
            })
            .eq('id', submission.id);

        if (aiUpdateError) {
            return NextResponse.json(
                { error: 'SUBMISSION_UPDATE_FAILED', message: aiUpdateError.message },
                { status: 500 },
            );
        }

        await writeTrustLedgerEvent(admin, {
            userId: user.id,
            applicationId: application.id,
            eventType: aiScan.processingStatus === 'RESUBMIT_REQUIRED' ? 'DOCUMENT_AI_FLAGGED' : 'DOCUMENT_AI_PASSED',
            payload: {
                submission_id: submission.id,
                document_type: submission.document_type,
                ai_result: aiScan.aiResult,
                ai_confidence: aiScan.aiConfidence,
                processed_at: nowIso,
            },
        });

        const { data: documentRows } = await admin
            .from('admission_document_submissions')
            .select('id,document_type,processing_status,final_result,ai_result,ai_confidence,file_storage_key_ephemeral,extracted_claims_json')
            .eq('admission_application_id', application.id)
            .eq('user_id', user.id);

        const docs = documentRows || [];
        const byType = new Map<string, { processing_status: string; final_result: string }>();
        for (const row of docs) {
            byType.set(row.document_type, {
                processing_status: row.processing_status,
                final_result: row.final_result,
            });
        }

        const allDocumentsUploaded = REQUIRED_DOCUMENT_TYPES.every((docType) => byType.has(docType));
        const aiProcessedAllDocs = REQUIRED_DOCUMENT_TYPES.every((docType) => {
            const row = byType.get(docType);
            return Boolean(row && row.processing_status !== 'PENDING');
        });

        if (!allDocumentsUploaded) {
            await admin
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.DOCUMENTS,
                })
                .eq('id', application.id);

            return NextResponse.json({
                success: true,
                next_step: ADMISSION_STAGES.DOCUMENTS,
                all_documents_uploaded: false,
            });
        }

        if (!aiProcessedAllDocs) {
            await admin
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.DOCUMENTS,
                })
                .eq('id', application.id);

            return NextResponse.json({
                success: true,
                next_step: ADMISSION_STAGES.DOCUMENTS,
                all_documents_uploaded: true,
                ai_processing_pending: true,
            });
        }

        await admin
            .from('admission_applications')
            .update({
                status: LEGACY_ADMISSION_STAGE_CODES.AI_REVIEW,
                current_step: ADMISSION_STAGES.AI_DECISION,
                submitted_at: application.submitted_at || nowIso,
                ai_review_started_at: nowIso,
            })
            .eq('id', application.id);

        await writeTrustLedgerEvent(admin, {
            userId: user.id,
            applicationId: application.id,
            eventType: 'AI_DECISION_STARTED',
            payload: {
                started_at: nowIso,
                document_types: REQUIRED_DOCUMENT_TYPES,
            },
        });

        if (parsed.data.run_auto_decision === false) {
            return NextResponse.json({
                success: true,
                next_step: 'AI_DECISION',
                all_documents_ai_processed: true,
            });
        }

        const decisionResult = await runAdmissionDecisionEngine(admin, {
            applicationId: application.id,
            userId: user.id,
            trigger: 'DOCUMENT_SUBMIT',
        });

        return NextResponse.json({
            success: true,
            auto_decision: decisionResult.decision,
            reason_code: decisionResult.reasonCode,
            confidence_score: decisionResult.confidenceScore,
            decision_run_id: decisionResult.decisionRunId,
            next_step: decisionResult.nextStep,
            application_status: decisionResult.applicationStatus,
            soul_credential_id: decisionResult.soulCredentialId,
            resubmit_document_types: decisionResult.resubmitDocumentTypes,
            exception_case_id: decisionResult.exceptionCaseId,
            review_case_id: decisionResult.reviewCaseId,
            purged_count: decisionResult.purgedCount,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
