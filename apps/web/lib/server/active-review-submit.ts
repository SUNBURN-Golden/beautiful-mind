import {
    ActiveReviewSubmitRequestSchema,
    ActiveReviewSubmitDataSchema,
    type ActiveReviewSubmitData,
    type ActiveReviewSubmitRequest,
} from '../contracts/active-review-contract.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

type SessionUser = {
    id: string;
};

type ActiveReviewSubmitDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    getServiceRoleClient: () => SupabaseClient;
    submitActiveTrustAttestation: (
        admin: SupabaseClient,
        userId: string,
        params: ActiveReviewSubmitRequest,
    ) => Promise<ActiveReviewSubmitData>;
};

function badRequest(message: string) {
    return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
}

export async function handleActiveReviewSubmit(
    request: Request,
    deps: ActiveReviewSubmitDeps,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = ActiveReviewSubmitRequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return badRequest(parsed.error.issues[0]?.message || 'Invalid attestation payload');
        }

        const admin = deps.getServiceRoleClient();
        const rawResult = await deps.submitActiveTrustAttestation(admin, user.id, parsed.data);
        const contractResult = ActiveReviewSubmitDataSchema.safeParse(rawResult);
        if (!contractResult.success) {
            return Response.json(
                {
                    error: 'ACTIVE_REVIEW_CONTRACT_MISMATCH',
                    message: contractResult.error.issues[0]?.message || 'Invalid attestation payload',
                },
                { status: 500 },
            );
        }

        return Response.json({
            source: 'API',
            data: contractResult.data,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.startsWith('MATCH_NOT_FOUND')) {
            return Response.json({ error: 'MATCH_NOT_FOUND', message }, { status: 404 });
        }
        if (message.startsWith('ATTESTATION_SELECTED_ITEMS_EMPTY')) {
            return badRequest('At least one attestation item is required');
        }

        return Response.json({ error: 'ACTIVE_REVIEW_SUBMIT_FAILED', message }, { status: 500 });
    }
}
