import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

function formatError(code: string, message: string, status: number, details?: any) {
    return NextResponse.json(
        { error: { code, message }, ...(details ? { details } : {}) },
        { status }
    );
}

export async function GET(req: Request) {
    try {
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
                    setAll(cookiesToSet: any[]) {
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
        let qualificationMissing: string[] = [];

        // 2. Fetch User SSOT State (READ-ONLY)
        // Check Banned status via RPC or Profile (assuming profiles.banned or similar. If not explicitly defined, we assume profiles has a mechanism. For now, let's query profiles.)
        // In the exact prompt, "banned=true 유저 -> 403 BANNED"
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('verified, banned')
            .eq('id', user.id)
            .single();

        if (profileErr) {
            console.error("Profile fetch error:", profileErr);
        }

        if (profile?.banned) {
            return formatError('BANNED', 'User is permanently banned.', 403);
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
                // Assuming required modules are OSINT, LOCATION, DEVICE
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
                            .select('decision')
                            .eq('user_id', user.id)
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

        // Response formatting
        const response: any = {
            stage: nextStep, // User requested 'stage'
            step: nextStep,  // Keeping 'step' for backward compatibility just in case
            completed: completedSteps.includes(nextStep),
            next: nextStep,
            blockers: blockers.map(b => b.code), // mapping to string[]
            meta: {
                schema_version: 1,
                server_time: new Date().toISOString()
            }
        };

        if (nextStep === STEPS.QUALIFICATION && qualificationMissing.length > 0) {
            // "필수 3종 VERIFIED 전 -> step=QUALIFICATION + details.missing_types 포함"
            // Wait, the manager said: `step=QUALIFICATION + details.missing_types`.
            // The schema for 200 OK did not explicitely have `details`, but they asked for it. 
            response.details = { missing_types: qualificationMissing };
        }

        return NextResponse.json(response, { status: 200 });

    } catch (err: any) {
        return formatError('INTERNAL_SERVER_ERROR', err.message, 500);
    }
}
