import {
    LivenessSessionCompleteRequestSchema,
    LivenessSessionCompleteResponseSchema,
    type LivenessSessionCompleteRequest,
} from '../contracts/admission-liveness-contract.ts';

type SessionUser = {
    id: string;
};

type LivenessVerificationResult = {
    verified: boolean;
    next_step?: string;
    message?: string;
};

type LivenessSessionCompleteDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    completeVerification: (
        userId: string,
        payload: LivenessSessionCompleteRequest,
        request: Request,
    ) => Promise<LivenessVerificationResult>;
    buildResultUrl: (request: Request, sessionId: string) => string;
};

function badRequest(message: string) {
    return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
}

export async function handleLivenessSessionComplete(
    request: Request,
    deps: LivenessSessionCompleteDeps,
): Promise<Response> {
    const user = await deps.getSessionUser();
    if (!user) {
        return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = LivenessSessionCompleteRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
        return badRequest(parsed.error.issues[0]?.message || 'Invalid liveness completion payload');
    }

    if (!parsed.data.immediate_purge_confirmed) {
        return Response.json(
            { error: 'PURGE_CONFIRM_REQUIRED', message: 'Immediate purge confirmation is required' },
            { status: 400 },
        );
    }

    try {
        const completion = await deps.completeVerification(user.id, parsed.data, request);
        const response = LivenessSessionCompleteResponseSchema.parse({
            success: true,
            verification_state: completion.verified ? 'VERIFIED' : 'PENDING',
            session_id: parsed.data.session_id,
            verified: completion.verified,
            next_step: completion.next_step,
            result_url: deps.buildResultUrl(request, parsed.data.session_id),
            retryable: !completion.verified,
            message: completion.message,
        });
        return Response.json(response);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.startsWith('IDENTITY_REQUIRED')) {
            return Response.json({ error: 'IDENTITY_REQUIRED', message }, { status: 409 });
        }
        if (message.startsWith('LIVENESS_VERIFY_FAILED')) {
            return Response.json({ error: 'LIVENESS_VERIFY_FAILED', message }, { status: 500 });
        }
        return Response.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
