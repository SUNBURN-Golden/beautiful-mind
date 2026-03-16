import { writeTrustLedgerEvent } from '../admission-events.ts';
import type { ExecutionBranchContext } from './execution-context';
import {
    buildExceptionApplicationUpdate,
    buildExceptionDocumentPatch,
} from './execution-payloads';
import { buildExceptionDecisionResult } from './execution-results';
import {
    markDocumentsPurged,
    writeRawPurgeLedgerEvent,
} from './execution-side-effects';
import type { ExecuteAdmissionDecisionResult } from './types';

export async function executeExceptionDecision(
    context: ExecutionBranchContext,
): Promise<ExecuteAdmissionDecisionResult> {
    const { admin, params, docs, nowIso, purgedCount } = context;

    await markDocumentsPurged(admin, docs, () => buildExceptionDocumentPatch({
        nowIso,
    }));

    const { data: exceptionCase, error: exceptionError } = await admin
        .from('exception_cases')
        .insert({
            admission_application_id: params.applicationId,
            user_id: params.userId,
            source_decision_run_id: params.decisionRunId,
            reason_code: params.escalationReasonCode || params.reasonCode,
            anomaly_summary_json: {
                reason_code: params.reasonCode,
                anomaly_flags: params.anomalyFlags,
                confidence_score: params.confidenceScore,
            },
            status: 'OPEN',
            created_at: nowIso,
        })
        .select('id')
        .single();

    if (exceptionError || !exceptionCase) {
        throw new Error(exceptionError?.message || 'Failed to create exception case');
    }

    const exceptionCaseId = exceptionCase.id;

    const { data: reviewCase, error: reviewCaseError } = await admin
        .from('review_cases')
        .upsert({
            admission_application_id: params.applicationId,
            user_id: params.userId,
            state: 'UNDER_REVIEW',
            opened_at: nowIso,
            decided_at: null,
            decided_by: null,
            reviewer_notes: null,
            ai_summary_json: {
                queue_type: 'EXCEPTION',
                exception_case_id: exceptionCaseId,
                source_decision_run_id: params.decisionRunId,
                reason_code: params.reasonCode,
                anomaly_flags: params.anomalyFlags,
            },
        }, { onConflict: 'admission_application_id' })
        .select('id')
        .single();

    if (reviewCaseError || !reviewCase) {
        throw new Error(reviewCaseError?.message || 'Failed to open review case for exception');
    }

    const reviewCaseId = reviewCase.id;

    await admin.from('review_case_events').insert({
        review_case_id: reviewCase.id,
        actor_user_id: params.actor.actorUserId,
        actor_role: params.actor.actorRole,
        event_type: 'EXCEPTION_OPENED',
        payload: {
            source_decision_run_id: params.decisionRunId,
            reason_code: params.reasonCode,
            anomaly_flags: params.anomalyFlags,
            confidence_score: params.confidenceScore,
            opened_at: nowIso,
        },
    });

    await admin
        .from('admission_applications')
        .update(buildExceptionApplicationUpdate({
            nowIso,
            reasonCode: params.reasonCode,
        }))
        .eq('id', params.applicationId);

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        eventType: 'EXCEPTION_CASE_OPENED',
        payload: {
            exception_case_id: exceptionCaseId,
            review_case_id: reviewCaseId,
            decision_run_id: params.decisionRunId,
            reason_code: params.reasonCode,
            anomaly_flags: params.anomalyFlags,
            opened_at: nowIso,
        },
    });

    await writeRawPurgeLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        source: params.actor.source,
        decisionRunId: params.decisionRunId,
        purgedCount,
        nowIso,
    });

    return buildExceptionDecisionResult({
        soulCredentialId: null,
        exceptionCaseId,
        reviewCaseId,
        purgedCount,
    });
}
