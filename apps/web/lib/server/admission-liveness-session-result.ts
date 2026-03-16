import { LivenessSessionResultResponseSchema } from '../contracts/admission-liveness-contract.ts';

type SessionUser = {
    id: string;
};

type LivenessResultState = {
    status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
    verified: boolean;
    next_step?: string;
    message?: string;
};

type LivenessSessionResultDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    readSessionResult: (userId: string, sessionId: string) => Promise<LivenessResultState>;
};

export async function handleLivenessSessionResult(
    request: Request,
    deps: LivenessSessionResultDeps,
): Promise<Response> {
    const user = await deps.getSessionUser();
    if (!user) {
        return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = (url.searchParams.get('session_id') || '').trim();
    if (!sessionId) {
        return Response.json({ error: 'BAD_REQUEST', message: 'session_id is required' }, { status: 400 });
    }

    const state = await deps.readSessionResult(user.id, sessionId);
    const response = LivenessSessionResultResponseSchema.parse({
        success: true,
        session_id: sessionId,
        status: state.status,
        verified: state.verified,
        next_step: state.next_step,
        message: state.message,
    });

    return Response.json(response);
}
