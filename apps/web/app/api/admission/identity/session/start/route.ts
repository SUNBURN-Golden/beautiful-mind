import { randomUUID } from 'crypto';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { getServiceRoleClient, getSessionUser, isTestRouteEnabled } from '@/lib/server/trust';
import { ensureAdmissionApplication } from '@/lib/server/admission-core';
import { handleIdentitySessionStart } from '@/lib/server/admission-identity-session-start';

function buildCallbackUrl(request: Request): string {
    const origin = new URL(request.url).origin;
    return `${origin}/apply/identity/callback`;
}

function buildIdentityVerificationId(userId: string): string {
    const compactUserId = userId.replace(/-/g, '').slice(0, 12);
    return `idv_${compactUserId}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
    return handleIdentitySessionStart(request, {
        getSessionUser,
        ensureIdentityApplication: async (userId: string) => {
            const admin = getServiceRoleClient();
            const { application } = await ensureAdmissionApplication(admin, userId);
            const { error } = await admin
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.IDENTITY,
                })
                .eq('id', application.id);

            if (error) {
                throw new Error(error.message);
            }
        },
        isTestRouteEnabled,
        getPortOneConfig: () => ({
            storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || null,
            channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || null,
        }),
        buildIdentityVerificationId,
        buildCallbackUrl,
        now: () => new Date(),
    });
}
