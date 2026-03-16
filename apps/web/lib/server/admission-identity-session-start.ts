import type { IdentitySessionStartRequest } from '../contracts/admission-identity-contract.ts';
import {
    IdentitySessionStartRequestSchema,
    IdentitySessionStartResponseSchema,
} from '../contracts/admission-identity-contract.ts';

type SessionUser = {
    id: string;
};

type IdentitySessionStartDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    ensureIdentityApplication: (userId: string) => Promise<void>;
    isTestRouteEnabled: () => boolean;
    getPortOneConfig: () => { storeId: string | null; channelKey: string | null };
    buildIdentityVerificationId: (userId: string) => string;
    buildCallbackUrl: (request: Request) => string;
    now: () => Date;
};

type StartPayload = {
    mode: 'PORTONE_SDK' | 'TEST_REDIRECT';
    identityVerificationId: string;
    redirectUrl: string;
    handoffUrl?: string;
    storeId?: string;
    channelKey?: string;
    message?: string;
};

function badRequest(message: string) {
    return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
}

function buildStartResponse(payload: StartPayload, now: Date) {
    return IdentitySessionStartResponseSchema.parse({
        success: true,
        provider: 'PORTONE',
        session: {
            mode: payload.mode,
            identity_verification_id: payload.identityVerificationId,
            redirect_url: payload.redirectUrl,
            handoff_url: payload.handoffUrl,
            store_id: payload.storeId,
            channel_key: payload.channelKey,
            expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        },
        message: payload.message,
    });
}

function buildMockHandoffUrl(callbackUrl: string, identityVerificationId: string) {
    const url = new URL(callbackUrl);
    url.searchParams.set('identityVerificationId', identityVerificationId);
    return url.toString();
}

export async function handleIdentitySessionStart(
    request: Request,
    deps: IdentitySessionStartDeps,
): Promise<Response> {
    const user = await deps.getSessionUser();
    if (!user) {
        return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = IdentitySessionStartRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
        return badRequest(parsed.error.issues[0]?.message || 'Invalid identity session start payload');
    }

    try {
        await deps.ensureIdentityApplication(user.id);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to prepare admission application';
        return Response.json({ error: 'APPLICATION_PREPARE_FAILED', message }, { status: 500 });
    }

    const now = deps.now();
    const redirectUrl = deps.buildCallbackUrl(request);
    const identityVerificationId = deps.buildIdentityVerificationId(user.id);
    const { storeId, channelKey } = deps.getPortOneConfig();

    const baseParams: IdentitySessionStartRequest = parsed.data;
    const customerMessage = baseParams.name || baseParams.phone
        ? 'Provider session created with customer context.'
        : 'Provider session created.';

    if (!storeId || !channelKey) {
        if (deps.isTestRouteEnabled()) {
            const payload = buildStartResponse({
                mode: 'TEST_REDIRECT',
                identityVerificationId,
                redirectUrl,
                handoffUrl: buildMockHandoffUrl(redirectUrl, 'mock_success'),
                message: 'Test mode session created. Redirecting with mock callback payload.',
            }, now);
            return Response.json(payload);
        }

        return Response.json(
            {
                error: 'SERVER_MISCONFIG',
                message: 'PortOne config is missing. Set NEXT_PUBLIC_PORTONE_STORE_ID and NEXT_PUBLIC_PORTONE_CHANNEL_KEY.',
            },
            { status: 500 },
        );
    }

    const payload = buildStartResponse({
        mode: 'PORTONE_SDK',
        identityVerificationId,
        redirectUrl,
        storeId,
        channelKey,
        message: customerMessage,
    }, now);

    return Response.json(payload);
}
