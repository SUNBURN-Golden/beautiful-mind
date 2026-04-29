import {
    ADMISSION_POLICY_VERSION,
    REQUIRED_CONSENT_TYPES,
    REQUIRED_DOCUMENT_TYPES,
} from '../admission-core.ts';
import type { JsonObject, StatusOverlayInputs, StatusTruthInputs } from './types.ts';
import type { DerivedStatusTruth } from './truth.ts';

function buildStatusTruthMeta(params: {
    truth: StatusTruthInputs;
    derived: DerivedStatusTruth;
    serverTime: string;
}): JsonObject {
    const { truth, derived, serverTime } = params;

    return {
        schema_version: 2,
        policy_version: ADMISSION_POLICY_VERSION,
        server_time: serverTime,
        admission_application_id: derived.application?.id || null,
        admission_status: derived.application?.status || null,
        admission_current_step: derived.application?.current_step || null,
        identity_verified: derived.stageSignals.hasIdentity,
        liveness_verified: derived.stageSignals.hasLiveness,
        consents_completed: derived.consentProgress.consentCompleted,
        documents_verified_count: derived.documentProgress.verifiedCount,
        documents_required_total: derived.documentProgress.totalRequired,
        soul_credential_issued: truth.soulCredential?.status === 'ISSUED',
        soul_credential_id: truth.soulCredential?.id || null,
        soul_credential_issued_at: truth.soulCredential?.issued_at || null,
        appeal_id: truth.latestAppeal?.id || null,
        appeal_status: truth.latestAppeal?.status || null,
        appeal_created_at: truth.latestAppeal?.created_at || null,
        exception_case_id: truth.latestExceptionCase?.id || null,
        exception_case_status: truth.latestExceptionCase?.status || null,
        exception_reason_code: truth.latestExceptionCase?.reason_code || null,
        audit_sample_id: truth.latestAuditSample?.id || null,
        audit_sample_status: truth.latestAuditSample?.status || null,
        audit_sample_reason: truth.latestAuditSample?.sample_reason || null,
        is_frozen: derived.profile?.is_frozen === true,
        freeze_reason: derived.profile?.freeze_reason || null,
        audit_in_progress: truth.openAudits.length > 0,
        open_audit_count: truth.openAudits.length,
        required_documents: REQUIRED_DOCUMENT_TYPES.map((type) => ({
            type,
            status: derived.documentProgress.byType.get(type)?.final_result || 'MISSING',
            upload_status: derived.documentProgress.byType.get(type)?.upload_status || 'MISSING',
            processing_status: derived.documentProgress.byType.get(type)?.processing_status || 'PENDING',
            ai_confidence: derived.documentProgress.byType.get(type)?.ai_confidence || null,
            purged_at: derived.documentProgress.byType.get(type)?.purged_at || null,
        })),
        required_consents: REQUIRED_CONSENT_TYPES.map((type) => ({
            type,
            granted: derived.consentProgress.consentSet.has(type),
        })),
        blocker: derived.blockers[0] || null,
    } satisfies JsonObject;
}

function buildStatusOverlayMeta(overlays: StatusOverlayInputs): JsonObject {
    return {
        review_case_id: overlays.reviewCase?.id || null,
        review_case_state: overlays.reviewCase?.state || null,
        review_queue_type: (() => {
            const value = overlays.reviewCase?.ai_summary_json?.queue_type;
            return typeof value === 'string' ? value : null;
        })(),
        ai_decision_run_id: overlays.latestDecisionRun?.id || null,
        ai_decision_final: overlays.latestDecisionRun?.final_decision || null,
        ai_decision_confidence: overlays.latestDecisionRun?.confidence_score || null,
        ai_decision_reason_code: (() => {
            const value = overlays.latestDecisionRun?.ai_outputs_json?.reason_code;
            return typeof value === 'string' ? value : null;
        })(),
        ai_decision_escalation_reason: overlays.latestDecisionRun?.escalation_reason_code || null,
        trust_level: overlays.latestSoulClaim?.trust_level || null,
        soul_claim_status: overlays.latestSoulClaim?.status || null,
        soul_claim_type: overlays.latestSoulClaim?.claim_type || null,
        soul_claim_issuer: overlays.latestSoulClaim?.issuer || null,
        soul_claim_issued_at: overlays.latestSoulClaim?.issued_at || null,
    } satisfies JsonObject;
}

export function buildStatusMeta(params: {
    truth: StatusTruthInputs;
    overlays: StatusOverlayInputs;
    derived: DerivedStatusTruth;
    serverTime: string;
}): JsonObject {
    return {
        ...buildStatusTruthMeta({
            truth: params.truth,
            derived: params.derived,
            serverTime: params.serverTime,
        }),
        ...buildStatusOverlayMeta(params.overlays),
    };
}
