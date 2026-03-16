import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { listActiveMatches } from '@/lib/server/active-core';
import { handleActiveMatchesGet } from '@/lib/server/active-matches-handler';

export async function GET(request: Request) {
    return handleActiveMatchesGet(request, {
        getSessionUser,
        getServiceRoleClient,
        listActiveMatches,
    });
}
