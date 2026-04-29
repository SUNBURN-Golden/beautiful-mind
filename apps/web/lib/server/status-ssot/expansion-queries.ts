import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AppealRow,
    AuditRow,
    AuditSampleRow,
    DecisionRun,
    ExceptionCaseRow,
    ReviewCase,
    SoulClaim,
    StatusOverlayInputs,
    StatusTruthOverlayInputs,
} from './types.ts';

export async function fetchStatusExpansionInputs(
    admin: SupabaseClient,
    userId: string,
) {
    const [
        openAuditsResult,
        appealResult,
        exceptionCaseResult,
        auditSampleResult,
        reviewCaseResult,
        soulClaimResult,
        decisionRunResult,
    ] = await Promise.all([
        admin
            .from('audits')
            .select('id,state')
            .eq('subject_user_id', userId)
            .in('state', ['OPEN', 'FROZEN', 'UNDER_REVIEW'])
            .returns<AuditRow[]>(),
        admin
            .from('appeals')
            .select('id,status,created_at,resolved_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<AppealRow>(),
        admin
            .from('exception_cases')
            .select('id,status,reason_code,created_at,resolved_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<ExceptionCaseRow>(),
        admin
            .from('audit_samples')
            .select('id,status,sample_reason,created_at,reviewed_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<AuditSampleRow>(),
        admin
            .from('review_cases')
            .select('id,state,ai_summary_json,opened_at,decided_at')
            .eq('user_id', userId)
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle<ReviewCase>(),
        admin
            .from('sbt_claims')
            .select('id,claim_type,trust_level,status,issuer,issued_at')
            .eq('user_id', userId)
            .in('claim_type', ['ADMISSION_SOUL', 'SOUL_TRUST'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<SoulClaim>(),
        admin
            .from('admission_decision_runs')
            .select('id,final_decision,confidence_score,escalation_reason_code,ai_outputs_json,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle<DecisionRun>(),
    ]);

    const truth: StatusTruthOverlayInputs = {
        openAudits: openAuditsResult.data ?? [],
        latestAppeal: appealResult.data ?? null,
        latestExceptionCase: exceptionCaseResult.data ?? null,
        latestAuditSample: auditSampleResult.data ?? null,
    };
    const overlays: StatusOverlayInputs = {
        reviewCase: reviewCaseResult.data ?? null,
        latestSoulClaim: soulClaimResult.data ?? null,
        latestDecisionRun: decisionRunResult.data ?? null,
    };

    return {
        truth,
        overlays,
    };
}
