import {
    LivenessSessionStartRequestSchema,
    LivenessSessionStartResponseSchema,
} from '../contracts/admission-liveness-contract.ts';

type SessionUser = {
    id: string;
};

type LivenessSessionStartDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    hasIdentityClaim: (userId: string) => Promise<boolean>;
    ensureLivenessApplication: (userId: string) => Promise<void>;
    isTestRouteEnabled: () => boolean;
    buildSessionId: (userId: string) => string;
    buildCallbackUrl: (request: Request, sessionId: string) => string;
    buildResultUrl: (request: Request, sessionId: string) => string;
    now: () => Date;
};

function badRequest(message: string) {
    return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
}

export async function handleLivenessSessionStart(
    request: Request,
    deps: LivenessSessionStartDeps,
): Promise<Response> {
    const user = await deps.getSessionUser();
    if (!user) {
        return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = LivenessSessionStartRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
        return badRequest(parsed.error.issues[0]?.message || 'Invalid liveness session start payload');
    }

    const hasIdentity = await deps.hasIdentityClaim(user.id);
    if (!hasIdentity) {
        return Response.json(
            { error: 'IDENTITY_REQUIRED', message: 'Identity verification must be completed first.' },
            { status: 409 },
        );
    }

    try {
        await deps.ensureLivenessApplication(user.id);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to prepare liveness step';
        return Response.json({ error: 'APPLICATION_PREPARE_FAILED', message }, { status: 500 });
    }

    const sessionId = deps.buildSessionId(user.id);
    const now = deps.now();
    const response = LivenessSessionStartResponseSchema.parse({
        success: true,
        provider: 'LIVENESS',
        session: {
            mode: deps.isTestRouteEnabled() ? 'TEST_CAPTURE' : 'CAMERA_CAPTURE',
            session_id: sessionId,
            callback_url: deps.buildCallbackUrl(request, sessionId),
            result_url: deps.buildResultUrl(request, sessionId),
            expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
            capture_timeout_ms: 90_000,
        },
        message: parsed.data.capture_mode === 'CAMERA'
            ? 'Camera capture session initialized.'
            : 'Liveness session initialized.',
    });

    return Response.json(response);
}
