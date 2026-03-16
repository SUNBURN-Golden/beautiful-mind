import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { submitActiveTrustAttestation } from '@/lib/server/active-trust';
import { handleActiveReviewSubmit } from '@/lib/server/active-review-submit';

export async function POST(request: Request) {
    return handleActiveReviewSubmit(request, {
        getSessionUser,
        getServiceRoleClient,
        submitActiveTrustAttestation,
    });
}
