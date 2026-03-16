import { NextResponse } from 'next/server';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import {
    ADMISSION_POLICY_VERSION,
    ensureAdmissionApplication,
} from '@/lib/server/admission-core';
import { writeTrustLedgerEvent } from '@/lib/server/admission-events';

export async function POST() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const admin = getServiceRoleClient();
        const { application, isNew } = await ensureAdmissionApplication(admin, user.id);

        const nowIso = new Date().toISOString();
        if (application.status === 'ACTIVE') {
            return NextResponse.json(
                { error: 'ALREADY_ACTIVE', message: 'Admission is already active for this account.' },
                { status: 409 }
            );
        }

        if (['APPEAL_PENDING', 'AUDIT_REVIEW'].includes(application.status)) {
            return NextResponse.json(
                {
                    error: 'COLD_PATH_IN_PROGRESS',
                    message: `Current status ${application.status} is under cold-path handling. Please wait for decision.`,
                },
                { status: 409 },
            );
        }

        if (application.status === 'REJECTED') {
            const { error: resetError } = await admin
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.IDENTITY,
                    rejection_reason_code: null,
                    rejected_at: null,
                    started_at: nowIso,
                })
                .eq('id', application.id);

            if (resetError) {
                return NextResponse.json(
                    { error: 'APPLICATION_RESET_FAILED', message: resetError.message },
                    { status: 500 },
                );
            }
        } else if (application.current_step === ADMISSION_STAGES.APPLY_START) {
            await admin
                .from('admission_applications')
                .update({
                    current_step: ADMISSION_STAGES.IDENTITY,
                    policy_version: ADMISSION_POLICY_VERSION,
                })
                .eq('id', application.id);
        }

        if (isNew) {
            await writeTrustLedgerEvent(admin, {
                userId: user.id,
                applicationId: application.id,
                eventType: 'ADMISSION_APPLICATION_STARTED',
                payload: {
                    policy_version: ADMISSION_POLICY_VERSION,
                    started_at: nowIso,
                },
            });
        }

        return NextResponse.json({
            success: true,
            application_id: application.id,
            status: 'IN_PROGRESS',
            current_step: ADMISSION_STAGES.IDENTITY,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
