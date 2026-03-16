import { randomUUID } from 'crypto';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { getServiceRoleClient, getSessionUser, isTestRouteEnabled } from '@/lib/server/trust';
import { ensureAdmissionApplication } from '@/lib/server/admission-core';
import { handleLivenessSessionStart } from '@/lib/server/admission-liveness-session-start';

function buildSessionId(userId: string) {
    const compactUserId = userId.replace(/-/g, '').slice(0, 12);
    return `lvs_${compactUserId}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function buildCallbackUrl(request: Request, sessionId: string): string {
    const origin = new URL(request.url).origin;
    const url = new URL('/apply/liveness/callback', origin);
    url.searchParams.set('session_id', sessionId);
    return url.toString();
}

function buildResultUrl(request: Request, sessionId: string): string {
    const origin = new URL(request.url).origin;
    const url = new URL('/api/admission/liveness/session/result', origin);
    url.searchParams.set('session_id', sessionId);
    return url.toString();
}

export async function POST(request: Request) {
    return handleLivenessSessionStart(request, {
        getSessionUser,
        hasIdentityClaim: async (userId: string) => {
            const admin = getServiceRoleClient();
            const { data } = await admin
                .from('identity_claims')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle();
            return Boolean(data);
        },
        ensureLivenessApplication: async (userId: string) => {
            const admin = getServiceRoleClient();
            const { application } = await ensureAdmissionApplication(admin, userId);
            const { error } = await admin
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.LIVENESS,
                })
                .eq('id', application.id);
            if (error) {
                throw new Error(error.message);
            }
        },
        isTestRouteEnabled,
        buildSessionId,
        buildCallbackUrl,
        buildResultUrl,
        now: () => new Date(),
    });
}
