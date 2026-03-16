import { handleLivenessSessionResult } from '@/lib/server/admission-liveness-session-result';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';

export async function GET(request: Request) {
    return handleLivenessSessionResult(request, {
        getSessionUser,
        readSessionResult: async (userId) => {
            const admin = getServiceRoleClient();
            const { data: application } = await admin
                .from('admission_applications')
                .select('id,current_step,liveness_verified_at,created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle<{ id: string; current_step: string | null; liveness_verified_at: string | null; created_at: string }>();

            const verified = Boolean(application?.liveness_verified_at);
            return {
                status: verified ? 'VERIFIED' as const : 'PENDING' as const,
                verified,
                next_step: verified ? (application?.current_step || 'CONSENTS') : undefined,
                message: verified
                    ? 'Liveness verification is confirmed.'
                    : 'Waiting for liveness verification result.',
            };
        },
    });
}
