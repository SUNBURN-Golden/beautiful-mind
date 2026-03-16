import { getServiceRoleClient, getSessionUser, isTestRouteEnabled } from '@/lib/server/trust';
import {
    handleIdentitySessionComplete,
} from '@/lib/server/admission-identity-session-complete';
import type { IdentitySessionCompleteRequest } from '@/lib/contracts/admission-identity-contract';
import { verifyIdentityForUser } from '@/lib/server/admission-identity-verify';

async function forwardVerifyComplete(
    userId: string,
    params: IdentitySessionCompleteRequest,
    _request: Request,
): Promise<{ status: number; payload: unknown }> {
    const admin = getServiceRoleClient();
    const result = await verifyIdentityForUser(
        admin,
        userId,
        {
            identityVerificationId: params.identityVerificationId,
            name: params.name,
            phone: params.phone,
        },
        {
            isTestRouteEnabled: isTestRouteEnabled(),
            portOneApiSecret: process.env.PORTONE_API_SECRET,
            fetchImpl: fetch,
        },
    );

    return {
        status: result.status,
        payload: result.payload,
    };
}

export async function POST(request: Request) {
    return handleIdentitySessionComplete(request, {
        getSessionUser,
        forwardVerifyComplete,
    });
}
