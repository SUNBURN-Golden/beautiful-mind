import { handleLivenessSessionComplete } from '@/lib/server/admission-liveness-session-complete';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import type { LivenessSessionCompleteRequest } from '@/lib/contracts/admission-liveness-contract';
import { verifyLivenessForUser } from '@/lib/server/admission-liveness-verify';

function buildResultUrl(request: Request, sessionId: string) {
    const origin = new URL(request.url).origin;
    const url = new URL('/api/admission/liveness/session/result', origin);
    url.searchParams.set('session_id', sessionId);
    return url.toString();
}

function deriveConfidence(payload: LivenessSessionCompleteRequest): number {
    if (typeof payload.capture_width === 'number' && typeof payload.capture_height === 'number') {
        const area = payload.capture_width * payload.capture_height;
        if (area >= 640 * 480) return 0.99;
        if (area >= 480 * 320) return 0.96;
    }
    return 0.94;
}

export async function POST(request: Request) {
    return handleLivenessSessionComplete(request, {
        getSessionUser,
        completeVerification: async (userId, payload) => {
            const admin = getServiceRoleClient();
            const result = await verifyLivenessForUser(
                admin,
                userId,
                {
                    provider: 'liveness_capture_v1',
                    confidence: deriveConfidence(payload),
                    media_ref: `capture:${payload.capture_hash.slice(0, 16)}`,
                    immediate_purge_confirmed: payload.immediate_purge_confirmed,
                },
                () => new Date(),
            );

            const upstreamPayload = result.payload as { message?: unknown; verified?: unknown; next_step?: unknown };
            if (result.status >= 400) {
                throw new Error(
                    `LIVENESS_VERIFY_FAILED:${typeof upstreamPayload?.message === 'string' ? upstreamPayload.message : result.status}`,
                );
            }

            return {
                verified: upstreamPayload?.verified === true,
                next_step: typeof upstreamPayload?.next_step === 'string' ? upstreamPayload.next_step : 'CONSENTS',
                message: typeof upstreamPayload?.message === 'string' ? upstreamPayload.message : 'Liveness verification completed.',
            };
        },
        buildResultUrl,
    });
}
