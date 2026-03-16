import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { openAdmissionAppeal } from '@/lib/server/admission-appeal';

const AppealSchema = z.object({
    reason_code: z.string().trim().min(1).max(128),
    statement: z.string().trim().min(10).max(3000),
    evidence_ref: z.string().trim().max(512).optional().default(''),
});

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = AppealSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid appeal payload' },
                { status: 400 },
            );
        }

        const admin = getServiceRoleClient();
        const result = await openAdmissionAppeal(admin, {
            userId: user.id,
            reasonCode: parsed.data.reason_code,
            statement: parsed.data.statement,
            evidenceRef: parsed.data.evidence_ref || null,
        });

        return NextResponse.json({
            success: true,
            appeal_id: result.appealId,
            review_case_id: result.reviewCaseId,
            source_decision_run_id: result.decisionRunId,
            next_step: 'APPEAL_PENDING',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.startsWith('APPEAL_NOT_ALLOWED:')) {
            const currentStatus = message.split(':')[1] || 'UNKNOWN';
            return NextResponse.json(
                {
                    error: 'APPEAL_NOT_ALLOWED',
                    message: 'Appeal is allowed only for REJECTED, RESUBMIT_REQUIRED, or EXCEPTION_REQUIRED.',
                    current_status: currentStatus,
                },
                { status: 409 },
            );
        }
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
