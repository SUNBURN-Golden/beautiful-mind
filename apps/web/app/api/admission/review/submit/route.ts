import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { ensureAdmissionApplication } from '@/lib/server/admission-core';
import { runAdmissionDecisionEngine } from '@/lib/server/admission-decision-engine/run';

export async function POST() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const admin = getServiceRoleClient();
        const { application } = await ensureAdmissionApplication(admin, user.id);
        const result = await runAdmissionDecisionEngine(admin, {
            applicationId: application.id,
            userId: user.id,
            trigger: 'RETRY',
        });

        return NextResponse.json({
            success: true,
            auto_decision: result.decision,
            reason_code: result.reasonCode,
            confidence_score: result.confidenceScore,
            decision_run_id: result.decisionRunId,
            application_status: result.applicationStatus,
            next_step: result.nextStep,
            soul_credential_id: result.soulCredentialId,
            purged_count: result.purgedCount,
            resubmit_document_types: result.resubmitDocumentTypes,
            exception_case_id: result.exceptionCaseId,
            review_case_id: result.reviewCaseId,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
