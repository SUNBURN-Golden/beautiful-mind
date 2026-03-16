import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAdmissionApplication } from './admission-core.ts';
import { writeTrustLedgerEvent } from './admission-events.ts';
import { ADMISSION_STAGES } from '../contracts/status-stages.ts';

const APPEAL_ELIGIBLE_STATUSES = [
    ADMISSION_STAGES.REJECTED,
    ADMISSION_STAGES.RESUBMIT_REQUIRED,
    'EXCEPTION_REQUIRED',
] as const;

type OpenAdmissionAppealParams = {
    userId: string;
    reasonCode: string;
    statement: string;
    evidenceRef?: string | null;
};

type OpenAdmissionAppealResult = {
    appealId: string;
    reviewCaseId: string;
    decisionRunId: string | null;
};

export type AppealWorkflowContext = {
    applicationId: string;
    userId: string;
    reasonCode: string;
    statement: string;
    evidenceRef: string | null;
    decisionRunId: string | null;
    nowIso: string;
};

type AppealInsertPayload = {
    user_id: string;
    admission_application_id: string;
    source_decision_run_id: string | null;
    status: 'OPEN';
    appeal_reason_text: string;
    evidence_ref: string | null;
    created_at: string;
};

type ReviewCaseUpsertPayload = {
    admission_application_id: string;
    user_id: string;
    state: 'UNDER_REVIEW';
    opened_at: string;
    reviewer_notes: null;
    decided_at: null;
    decided_by: null;
    ai_summary_json: Record<string, unknown>;
};

type ReviewCaseEventInsertPayload = {
    review_case_id: string;
    actor_user_id: string;
    actor_role: 'APPLICANT';
    event_type: 'APPEAL_OPENED';
    payload: Record<string, unknown>;
};

type ApplicationAppealPatch = {
    status: typeof ADMISSION_STAGES.APPEAL_PENDING;
    current_step: typeof ADMISSION_STAGES.APPEAL_PENDING;
    human_review_started_at: string;
};

type AppealLedgerPayload = {
    appeal_id: string;
    review_case_id: string;
    source_decision_run_id: string | null;
    reason_code: string;
    evidence_ref: string | null;
    requested_at: string;
};

export type AppealWorkflowHandlers = {
    createAppeal(payload: AppealInsertPayload): Promise<{ id: string }>;
    upsertReviewCase(payload: ReviewCaseUpsertPayload): Promise<{ id: string }>;
    appendReviewCaseEvent(payload: ReviewCaseEventInsertPayload): Promise<void>;
    updateApplicationState(applicationId: string, patch: ApplicationAppealPatch): Promise<void>;
    appendLedgerEvent(payload: AppealLedgerPayload): Promise<void>;
};

function assertAppealEligibleStatus(status: string): void {
    if (!APPEAL_ELIGIBLE_STATUSES.includes(status as (typeof APPEAL_ELIGIBLE_STATUSES)[number])) {
        throw new Error(`APPEAL_NOT_ALLOWED:${status}`);
    }
}

async function fetchLatestDecisionRunId(
    admin: SupabaseClient,
    applicationId: string,
): Promise<string | null> {
    const { data: latestDecisionRun } = await admin
        .from('admission_decision_runs')
        .select('id,final_decision,created_at')
        .eq('admission_application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return latestDecisionRun?.id || null;
}

export function buildAppealReasonText(reasonCode: string, statement: string): string {
    return `${reasonCode}: ${statement}`;
}

export function buildAppealInsertPayload(context: AppealWorkflowContext): AppealInsertPayload {
    return {
        user_id: context.userId,
        admission_application_id: context.applicationId,
        source_decision_run_id: context.decisionRunId,
        status: 'OPEN',
        appeal_reason_text: buildAppealReasonText(context.reasonCode, context.statement),
        evidence_ref: context.evidenceRef,
        created_at: context.nowIso,
    };
}

export function buildAppealReviewCaseUpsertPayload(
    context: AppealWorkflowContext,
    appealId: string,
): ReviewCaseUpsertPayload {
    return {
        admission_application_id: context.applicationId,
        user_id: context.userId,
        state: 'UNDER_REVIEW',
        opened_at: context.nowIso,
        reviewer_notes: null,
        decided_at: null,
        decided_by: null,
        ai_summary_json: {
            queue_type: 'APPEAL',
            appeal_id: appealId,
            reason_code: context.reasonCode,
            statement: context.statement,
            evidence_ref: context.evidenceRef,
            source_decision_run_id: context.decisionRunId,
        },
    };
}

export function buildAppealReviewCaseEventPayload(
    context: AppealWorkflowContext,
    appealId: string,
    reviewCaseId: string,
): ReviewCaseEventInsertPayload {
    return {
        review_case_id: reviewCaseId,
        actor_user_id: context.userId,
        actor_role: 'APPLICANT',
        event_type: 'APPEAL_OPENED',
        payload: {
            appeal_id: appealId,
            reason_code: context.reasonCode,
            statement: context.statement,
            evidence_ref: context.evidenceRef,
            source_decision_run_id: context.decisionRunId,
            requested_at: context.nowIso,
        },
    };
}

export function buildApplicationAppealPatch(nowIso: string): ApplicationAppealPatch {
    return {
        status: ADMISSION_STAGES.APPEAL_PENDING,
        current_step: ADMISSION_STAGES.APPEAL_PENDING,
        human_review_started_at: nowIso,
    };
}

export function buildAppealLedgerPayload(
    context: AppealWorkflowContext,
    appealId: string,
    reviewCaseId: string,
): AppealLedgerPayload {
    return {
        appeal_id: appealId,
        review_case_id: reviewCaseId,
        source_decision_run_id: context.decisionRunId,
        reason_code: context.reasonCode,
        evidence_ref: context.evidenceRef,
        requested_at: context.nowIso,
    };
}

export async function runOpenAppealWorkflow(
    context: AppealWorkflowContext,
    handlers: AppealWorkflowHandlers,
): Promise<{ appealId: string; reviewCaseId: string }> {
    // Ordered side effects:
    // 1) create appeal -> 2) upsert review case -> 3) append review event
    // 4) update application state -> 5) append trust-ledger event.
    const appeal = await handlers.createAppeal(buildAppealInsertPayload(context));
    const reviewCase = await handlers.upsertReviewCase(
        buildAppealReviewCaseUpsertPayload(context, appeal.id),
    );
    await handlers.appendReviewCaseEvent(
        buildAppealReviewCaseEventPayload(context, appeal.id, reviewCase.id),
    );
    await handlers.updateApplicationState(
        context.applicationId,
        buildApplicationAppealPatch(context.nowIso),
    );
    await handlers.appendLedgerEvent(
        buildAppealLedgerPayload(context, appeal.id, reviewCase.id),
    );

    return {
        appealId: appeal.id,
        reviewCaseId: reviewCase.id,
    };
}

export async function openAdmissionAppeal(
    admin: SupabaseClient,
    params: OpenAdmissionAppealParams,
): Promise<OpenAdmissionAppealResult> {
    const { application } = await ensureAdmissionApplication(admin, params.userId);
    assertAppealEligibleStatus(application.status);

    const nowIso = new Date().toISOString();
    const decisionRunId = await fetchLatestDecisionRunId(admin, application.id);
    const context: AppealWorkflowContext = {
        applicationId: application.id,
        userId: params.userId,
        reasonCode: params.reasonCode,
        statement: params.statement,
        evidenceRef: params.evidenceRef || null,
        decisionRunId,
        nowIso,
    };

    const workflowResult = await runOpenAppealWorkflow(context, {
        createAppeal: async (payload) => {
            const { data: appeal, error: appealError } = await admin
                .from('appeals')
                .insert(payload)
                .select('id')
                .single();

            if (appealError || !appeal) {
                throw new Error(appealError?.message || 'Failed to create appeal');
            }
            return { id: appeal.id };
        },
        upsertReviewCase: async (payload) => {
            const { data: reviewCase, error: reviewCaseError } = await admin
                .from('review_cases')
                .upsert(payload, { onConflict: 'admission_application_id' })
                .select('id')
                .single();

            if (reviewCaseError || !reviewCase) {
                throw new Error(reviewCaseError?.message || 'Failed to open review case for appeal');
            }
            return { id: reviewCase.id };
        },
        appendReviewCaseEvent: async (payload) => {
            const { error } = await admin
                .from('review_case_events')
                .insert(payload);
            if (error) {
                throw new Error(error.message);
            }
        },
        updateApplicationState: async (applicationId, patch) => {
            const { error } = await admin
                .from('admission_applications')
                .update(patch)
                .eq('id', applicationId);
            if (error) {
                throw new Error(error.message);
            }
        },
        appendLedgerEvent: async (payload) => {
            await writeTrustLedgerEvent(admin, {
                userId: params.userId,
                applicationId: application.id,
                eventType: 'APPEAL_OPENED',
                payload,
            });
        },
    });

    return {
        appealId: workflowResult.appealId,
        reviewCaseId: workflowResult.reviewCaseId,
        decisionRunId,
    };
}

export async function getLatestAppealStatus(
    admin: SupabaseClient,
    userId: string,
): Promise<Record<string, unknown> | null> {
    const { data: appeal, error } = await admin
        .from('appeals')
        .select('id,status,admission_application_id,source_decision_run_id,created_at,resolved_at,resolution_type,resolution_notes')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    if (!appeal) return null;

    const [{ data: application }, { data: reviewCase }] = await Promise.all([
        admin
            .from('admission_applications')
            .select('id,status,current_step,rejection_reason_code,updated_at')
            .eq('id', appeal.admission_application_id)
            .maybeSingle(),
        admin
            .from('review_cases')
            .select('id,state,opened_at,decided_at,reviewer_notes')
            .eq('admission_application_id', appeal.admission_application_id)
            .maybeSingle(),
    ]);

    return {
        appeal,
        application: application || null,
        review_case: reviewCase || null,
    };
}
