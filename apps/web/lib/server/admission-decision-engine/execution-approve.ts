import { writeTrustLedgerEvent } from '../admission-events.ts';
import { upsertVerifiedClaims } from './claims';
import type { ExecutionBranchContext } from './execution-context';
import { resolveAuditSampleRate } from './execution-context';
import {
    buildApproveApplicationUpdate,
    buildApproveDocumentPatch,
} from './execution-payloads';
import { buildApproveDecisionResult } from './execution-results';
import {
    issueSoulCredential,
    markDocumentsPurged,
    maybeOpenAuditSample,
    writeRawPurgeLedgerEvent,
} from './execution-side-effects';
import type { ExecuteAdmissionDecisionResult } from './types';

export async function executeApproveDecision(
    context: ExecutionBranchContext,
): Promise<ExecuteAdmissionDecisionResult> {
    const { admin, params, docs, nowIso, purgedCount, policyVersion } = context;

    await markDocumentsPurged(admin, docs, () => buildApproveDocumentPatch({
        nowIso,
        decisionNotes: params.decisionNotes,
        reasonCode: params.reasonCode,
    }));

    await upsertVerifiedClaims(
        admin,
        params.userId,
        docs,
        params.actor.source === 'AI_RULE_ENGINE' ? 'AI_RULE_ENGINE' : 'COLD_PATH_OVERRIDE',
        nowIso,
        policyVersion,
    );

    const soulCredentialId = await issueSoulCredential(admin, {
        applicationId: params.applicationId,
        userId: params.userId,
        decisionRunId: params.decisionRunId,
        source: params.actor.source,
        nowIso,
        actorRole: params.actor.actorRole,
    });

    await admin
        .from('admission_applications')
        .update(buildApproveApplicationUpdate(nowIso))
        .eq('id', params.applicationId);

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        soulCredentialId,
        eventType: 'ADMISSION_APPROVED',
        payload: {
            source: params.actor.source,
            reason_code: params.reasonCode,
            decision_run_id: params.decisionRunId,
            confidence_score: params.confidenceScore,
            anomaly_flags: params.anomalyFlags,
            decided_at: nowIso,
        },
    });

    await writeTrustLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        soulCredentialId,
        eventType: 'SOUL_CREDENTIAL_ISSUED',
        payload: {
            source: params.actor.source,
            decision_run_id: params.decisionRunId,
            issued_at: nowIso,
        },
    });

    const auditSample = await maybeOpenAuditSample(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        decisionRunId: params.decisionRunId,
        decision: params.decision,
        sampleRate: resolveAuditSampleRate(params),
    });

    if (auditSample.auditSampleId) {
        await writeTrustLedgerEvent(admin, {
            userId: params.userId,
            applicationId: params.applicationId,
            soulCredentialId,
            eventType: 'AUDIT_SAMPLE_OPENED',
            payload: {
                sample_id: auditSample.auditSampleId,
                review_case_id: auditSample.reviewCaseId,
                source_decision_run_id: params.decisionRunId,
                opened_at: nowIso,
            },
        });
    }

    await writeRawPurgeLedgerEvent(admin, {
        userId: params.userId,
        applicationId: params.applicationId,
        source: params.actor.source,
        decisionRunId: params.decisionRunId,
        purgedCount,
        nowIso,
        soulCredentialId,
    });

    return buildApproveDecisionResult({
        soulCredentialId,
        exceptionCaseId: null,
        reviewCaseId: auditSample.reviewCaseId,
        purgedCount,
    });
}
