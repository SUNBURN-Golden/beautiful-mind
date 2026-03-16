import { writeTrustLedgerEvent } from '../admission-events.ts';
import type { ExecutionBranchContext } from './execution-context';
import { resolveAuditSampleRate } from './execution-context';
import {
    buildRejectApplicationUpdate,
    buildRejectDocumentPatch,
} from './execution-payloads';
import { buildRejectDecisionResult } from './execution-results';
import {
    markDocumentsPurged,
    maybeOpenAuditSample,
    writeRawPurgeLedgerEvent,
} from './execution-side-effects';
import type { ExecuteAdmissionDecisionResult } from './types';

export async function executeRejectDecision(
    context: ExecutionBranchContext,
): Promise<ExecuteAdmissionDecisionResult> {
    const { admin, params, docs, nowIso, purgedCount } = context;

    await markDocumentsPurged(admin, docs, () => buildRejectDocumentPatch({
        nowIso,
        decisionNotes: params.decisionNotes,
        reasonCode: params.reasonCode,
    }));

    await admin
        .from('admission_applications')
        .update(buildRejectApplicationUpdate({
            nowIso,
            reasonCode: params.reasonCode,
        }))
        .eq('id', params.applicationId);

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        eventType: 'ADMISSION_REJECTED',
        payload: {
            source: params.actor.source,
            decision_run_id: params.decisionRunId,
            reason_code: params.reasonCode,
            confidence_score: params.confidenceScore,
            decided_at: nowIso,
        },
    });

    const auditSample = await maybeOpenAuditSample(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        decisionRunId: params.decisionRunId,
        decision: params.decision,
        sampleRate: resolveAuditSampleRate(params),
    });

    await writeRawPurgeLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        source: params.actor.source,
        decisionRunId: params.decisionRunId,
        purgedCount,
        nowIso,
    });

    return buildRejectDecisionResult({
        soulCredentialId: null,
        exceptionCaseId: null,
        reviewCaseId: auditSample.reviewCaseId,
        purgedCount,
    });
}
