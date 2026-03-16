import { writeTrustLedgerEvent } from '../admission-events.ts';
import type { ExecutionBranchContext } from './execution-context';
import {
    buildResubmitApplicationUpdate,
    buildResubmitDocumentPatch,
    resolveResubmitTargetDocumentTypes,
} from './execution-payloads';
import { buildResubmitDecisionResult } from './execution-results';
import {
    markDocumentsPurged,
    writeRawPurgeLedgerEvent,
} from './execution-side-effects';
import type { ExecuteAdmissionDecisionResult } from './types';

export async function executeResubmitDecision(
    context: ExecutionBranchContext,
): Promise<ExecuteAdmissionDecisionResult> {
    const { admin, params, docs, nowIso, purgedCount } = context;

    const targetDocTypeSet = resolveResubmitTargetDocumentTypes(params.resubmitDocumentTypes);
    const resubmitDocumentTypes = Array.from(targetDocTypeSet);

    await markDocumentsPurged(admin, docs, (doc) => buildResubmitDocumentPatch({
        doc,
        targetDocTypeSet,
        nowIso,
        decisionNotes: params.decisionNotes,
        reasonCode: params.reasonCode,
    }));

    await admin
        .from('admission_applications')
        .update(buildResubmitApplicationUpdate({
            nowIso,
            reasonCode: params.reasonCode,
        }))
        .eq('id', params.applicationId);

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        eventType: 'ADMISSION_RESUBMIT_REQUIRED',
        payload: {
            source: params.actor.source,
            decision_run_id: params.decisionRunId,
            reason_code: params.reasonCode,
            resubmit_document_types: resubmitDocumentTypes,
            decided_at: nowIso,
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

    return buildResubmitDecisionResult({
        soulCredentialId: null,
        exceptionCaseId: null,
        reviewCaseId: null,
        purgedCount,
        resubmitDocumentTypes,
    });
}
