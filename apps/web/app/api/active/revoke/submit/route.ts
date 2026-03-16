import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { submitParticipationRevokeRequest } from '@/lib/server/active-trust';
import { handleActiveRevokeSubmit } from '@/lib/server/active-revoke-handler';

export async function POST(req: Request) {
    return handleActiveRevokeSubmit(req, {
        getSessionUser,
        getServiceRoleClient,
        submitParticipationRevokeRequest,
    });
}
