import type {
    AdminClient,
    ExecuteAdmissionDecisionParams,
} from './types';

export async function maybeOpenAuditSample(
    admin: AdminClient,
    params: {
        userId: string;
        applicationId: string;
        decisionRunId: string;
        decision: ExecuteAdmissionDecisionParams['decision'];
        sampleRate: number;
    },
): Promise<{ auditSampleId: string | null; reviewCaseId: string | null }> {
    if (!['APPROVE', 'REJECT'].includes(params.decision)) {
        return { auditSampleId: null, reviewCaseId: null };
    }

    if (params.sampleRate <= 0) {
        return { auditSampleId: null, reviewCaseId: null };
    }

    if (Math.random() > params.sampleRate) {
        return { auditSampleId: null, reviewCaseId: null };
    }

    const nowIso = new Date().toISOString();

    const { data: sample, error: sampleError } = await admin
        .from('audit_samples')
        .insert({
            admission_application_id: params.applicationId,
            user_id: params.userId,
            source_decision_run_id: params.decisionRunId,
            sample_reason: `RANDOM_${params.decision}`,
            status: 'OPEN',
            created_at: nowIso,
        })
        .select('id')
        .single();

    if (sampleError || !sample) {
        throw new Error(sampleError?.message || 'Failed to create audit sample');
    }

    const { data: reviewCase, error: reviewCaseError } = await admin
        .from('review_cases')
        .upsert({
            admission_application_id: params.applicationId,
            user_id: params.userId,
            state: 'OPEN',
            opened_at: nowIso,
            ai_summary_json: {
                queue_type: 'AUDIT',
                source_decision_run_id: params.decisionRunId,
                sample_id: sample.id,
            },
            reviewer_notes: null,
        }, { onConflict: 'admission_application_id' })
        .select('id')
        .single();

    if (reviewCaseError || !reviewCase) {
        throw new Error(reviewCaseError?.message || 'Failed to open audit review case');
    }

    await admin.from('review_case_events').insert({
        review_case_id: reviewCase.id,
        actor_user_id: null,
        actor_role: 'AI_SYSTEM',
        event_type: 'AUDIT_SAMPLE_OPENED',
        payload: {
            sample_id: sample.id,
            source_decision_run_id: params.decisionRunId,
            opened_at: nowIso,
        },
    });

    return { auditSampleId: sample.id, reviewCaseId: reviewCase.id };
}
