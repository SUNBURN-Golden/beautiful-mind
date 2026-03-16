import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSessionOrCron } from '@/lib/server/admin-auth';
import { executeAdminReviewDecision } from '@/lib/server/admin-review-decisions';
import { isRouteServiceError } from '@/lib/server/route-service-error';

const DecisionSchema = z.object({
    review_case_id: z.string().uuid(),
    decision: z.enum(['APPROVE', 'REJECT', 'RESUBMIT', 'RESUBMIT_REQUIRED']),
    reviewer_notes: z.string().trim().max(2000).optional().default(''),
    rejection_reason_code: z.string().trim().max(128).optional().default(''),
    resubmit_document_types: z.array(z.string()).optional().default([]),
    resolution_type: z.string().trim().max(64).optional().default(''),
});

export async function POST(req: Request) {
    try {
        const auth = await assertAdminSessionOrCron(req);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const parsed = DecisionSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid decision payload' },
                { status: 400 },
            );
        }

        const result = await executeAdminReviewDecision(auth.admin, {
            reviewCaseId: parsed.data.review_case_id,
            decision: parsed.data.decision,
            reviewerNotes: parsed.data.reviewer_notes,
            rejectionReasonCode: parsed.data.rejection_reason_code,
            resubmitDocumentTypes: parsed.data.resubmit_document_types,
            resolutionType: parsed.data.resolution_type,
            actorUserId: auth.actorUserId,
            actorRole: auth.actorUserId ? 'ADMIN' : 'CRON',
        });

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error: unknown) {
        if (isRouteServiceError(error)) {
            const payload = error.code === 'REVIEW_CASE_NOT_FOUND'
                ? { error: error.code }
                : { error: error.code, message: error.message };
            return NextResponse.json(payload, { status: error.status });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
