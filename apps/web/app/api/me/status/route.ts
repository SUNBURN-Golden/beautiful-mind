import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// STEP ENUM
const STEPS = {
    LOGIN: 'LOGIN',
    KYC: 'KYC',
    QUALIFICATION: 'QUALIFICATION',
    CONSENT_HUB: 'CONSENT_HUB',
    E_SIGN: 'E_SIGN',
    AI_INTERVIEW: 'AI_INTERVIEW',
    DASHBOARD_READY: 'DASHBOARD_READY'
};

type SelfDevActionPreview = {
    title: string;
    priority: string;
    metric: string;
    target: string;
};

function extractSelfDevelopmentMeta(analysisJson: unknown): {
    confidence: number | null;
    focusTopics: string[];
    actionPlan: SelfDevActionPreview[];
} {
    if (!analysisJson || typeof analysisJson !== 'object') {
        return { confidence: null, focusTopics: [], actionPlan: [] };
    }
    const analysis = analysisJson as Record<string, unknown>;
    const selfDev = analysis.self_development && typeof analysis.self_development === 'object'
        ? analysis.self_development as Record<string, unknown>
        : null;
    if (!selfDev) {
        return { confidence: null, focusTopics: [], actionPlan: [] };
    }

    const confidence = typeof selfDev.confidence === 'number' ? selfDev.confidence : null;
    const focusTopics = Array.isArray(selfDev.focus_topics)
        ? selfDev.focus_topics.filter((item): item is string => typeof item === 'string').slice(0, 4)
        : [];

    const actionPlan = Array.isArray(selfDev.action_plan)
        ? selfDev.action_plan
            .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : null))
            .filter((item): item is Record<string, unknown> => item !== null)
            .map((item) => ({
                title: typeof item.title === 'string' ? item.title : 'Action',
                priority: typeof item.priority === 'string' ? item.priority : 'P2',
                metric: typeof item.metric === 'string' ? item.metric : 'N/A',
                target: typeof item.target === 'string' ? item.target : 'N/A',
            }))
            .slice(0, 3)
        : [];

    return { confidence, focusTopics, actionPlan };
}

function formatError(code: string, message: string, status: number, details?: unknown) {
    return NextResponse.json(
        { error: { code, message }, ...(details ? { details } : {}) },
        { status }
    );
}

export async function GET(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            return formatError(
                'SERVER_MISCONFIG',
                'Missing required Supabase env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY',
                500
            );
        }

        // 1. Auth Check - Support both Cookies and Authorization Header (for API tokens)
        const cookieStore = await cookies();
        let supabase;

        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            supabase = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: authHeader } }
            });
        } else {
            supabase = createServerClient(supabaseUrl, supabaseKey, {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll() {
                        // Read-only endpoint
                    },
                },
            });
        }

        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return formatError('AUTH_REQUIRED', 'Invalid or expired token', 401);
        }

        const completedSteps: string[] = [STEPS.LOGIN];
        const blockers: Array<{ code: string, retryable: boolean }> = [];
        let nextStep = STEPS.KYC;
        const qualificationMissing: string[] = [];

        // 2. Fetch User SSOT State (READ-ONLY)
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('verified, banned, is_frozen, freeze_reason')
            .eq('id', user.id)
            .single();

        if (profileErr) {
            console.error("Profile fetch error:", profileErr);
        }

        if (profile?.banned) {
            return formatError('BANNED', 'User is permanently banned.', 403);
        }

        if (profile?.is_frozen) {
            blockers.push({ code: 'ACCOUNT_FROZEN', retryable: false });
        }

        const { data: identity } = await supabase
            .from('identity_claims')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        // Check KYC
        const isKycComplete = profile?.verified || !!identity;
        if (isKycComplete) {
            completedSteps.push(STEPS.KYC);
            nextStep = STEPS.QUALIFICATION;

            // Check QUALIFICATION
            const { data: verifications } = await supabase
                .from('verifications')
                .select('type, status')
                .eq('user_id', user.id)
                .eq('status', 'VERIFIED');

            const vTypes = verifications?.map(v => v.type) || [];
            const hasResidence = vTypes.includes('RESIDENCE');
            const hasPhysical = vTypes.includes('PHYSICAL');
            const hasCareerOrEdu = vTypes.includes('CAREER') || vTypes.includes('EDUCATION');

            if (!hasResidence) qualificationMissing.push('RESIDENCE');
            if (!hasPhysical) qualificationMissing.push('PHYSICAL');
            if (!hasCareerOrEdu) qualificationMissing.push('CAREER_OR_EDUCATION');

            const isQualComplete = hasResidence && hasPhysical && hasCareerOrEdu;

            if (isQualComplete) {
                completedSteps.push(STEPS.QUALIFICATION);
                nextStep = STEPS.CONSENT_HUB;

                // Check CONSENT_HUB
                const { data: consents } = await supabase
                    .from('consents')
                    .select('module, is_granted')
                    .eq('user_id', user.id)
                    .eq('is_granted', true);

                const cModules = consents?.map(c => c.module) || [];
                const isConsentComplete = cModules.includes('OSINT') && cModules.includes('LOCATION') && cModules.includes('DEVICE');

                if (isConsentComplete) {
                    completedSteps.push(STEPS.CONSENT_HUB);
                    nextStep = STEPS.E_SIGN;

                    // Check E_SIGN
                    const { data: contracts } = await supabase
                        .from('contracts')
                        .select('id')
                        .eq('user_id', user.id)
                        .limit(1);

                    const isEsignComplete = contracts && contracts.length > 0;

                    if (isEsignComplete) {
                        completedSteps.push(STEPS.E_SIGN);
                        nextStep = STEPS.AI_INTERVIEW;

                        // Check AI_INTERVIEW
                        const { data: interviews } = await supabase
                            .from('interviews')
                            .select('decision,analysis_json')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        const isInterviewComplete = interviews && interviews.length > 0 && interviews[0].decision;

                        if (isInterviewComplete) {
                            completedSteps.push(STEPS.AI_INTERVIEW);
                            nextStep = STEPS.DASHBOARD_READY;
                        } else {
                            blockers.push({ code: 'INTERVIEW_REQUIRED', retryable: true });
                        }
                    } else {
                        blockers.push({ code: 'SIGNATURE_REQUIRED', retryable: true });
                    }
                } else {
                    blockers.push({ code: 'CONSENT_REQUIRED', retryable: true });
                }
            } else {
                blockers.push({ code: 'QUALIFICATION_REQUIRED', retryable: true });
            }
        } else {
            blockers.push({ code: 'KYC_REQUIRED', retryable: true });
        }

        const { data: latestClaim } = await supabase
            .from('sbt_claims')
            .select('id, claim_type, trust_level, status, issuer, issued_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const { data: openAudits } = await supabase
            .from('audits')
            .select('id, state')
            .eq('subject_user_id', user.id)
            .in('state', ['OPEN', 'FROZEN', 'UNDER_REVIEW']);

        const { data: latestInterviewRows } = await supabase
            .from('interviews')
            .select('analysis_json')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        const latestInterview = latestInterviewRows && latestInterviewRows.length > 0
            ? latestInterviewRows[0]
            : null;
        const selfDevMeta = extractSelfDevelopmentMeta(latestInterview?.analysis_json);

        // Response formatting
        const response: {
            stage: string;
            step: string;
            completed: boolean;
            next: string;
            blockers: string[];
            meta: {
                schema_version: number;
                server_time: string;
                required_verifications?: Array<{ type: string; status: string }>;
                trust_level?: string | null;
                sbt_status?: string | null;
                sbt_claim_type?: string | null;
                sbt_issuer?: string | null;
                sbt_issued_at?: string | null;
                is_frozen?: boolean;
                freeze_reason?: string | null;
                audit_in_progress?: boolean;
                open_audit_count?: number;
                self_dev_confidence?: number | null;
                self_dev_focus_topics?: string[];
                self_dev_action_plan?: SelfDevActionPreview[];
            };
            details?: { missing_types: string[] };
        } = {
            stage: nextStep,
            step: nextStep,
            completed: completedSteps.includes(nextStep),
            next: nextStep,
            blockers: blockers.map(b => b.code),
            meta: {
                schema_version: 1,
                server_time: new Date().toISOString(),
                trust_level: latestClaim?.trust_level || null,
                sbt_status: latestClaim?.status || null,
                sbt_claim_type: latestClaim?.claim_type || null,
                sbt_issuer: latestClaim?.issuer || null,
                sbt_issued_at: latestClaim?.issued_at || null,
                is_frozen: profile?.is_frozen === true,
                freeze_reason: profile?.freeze_reason || null,
                audit_in_progress: (openAudits?.length || 0) > 0,
                open_audit_count: openAudits?.length || 0,
                self_dev_confidence: selfDevMeta.confidence,
                self_dev_focus_topics: selfDevMeta.focusTopics,
                self_dev_action_plan: selfDevMeta.actionPlan
            }
        };

        if (nextStep === STEPS.QUALIFICATION && qualificationMissing.length > 0) {
            response.meta.required_verifications = qualificationMissing.map(type => ({
                type,
                status: 'MISSING'
            }));
            response.details = { missing_types: qualificationMissing };
        }

        return NextResponse.json(response, { status: 200 });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected server error';
        return formatError('INTERNAL_SERVER_ERROR', message, 500);
    }
}
