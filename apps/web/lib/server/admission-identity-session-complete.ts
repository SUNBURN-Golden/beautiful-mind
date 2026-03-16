import {
    IdentitySessionCompleteRequestSchema,
    IdentitySessionCompleteResponseSchema,
    type IdentitySessionCompleteRequest,
} from '../contracts/admission-identity-contract.ts';

type SessionUser = {
    id: string;
};

type ForwardResult = {
    status: number;
    payload: unknown;
};

type IdentitySessionCompleteDeps = {
    getSessionUser: () => Promise<SessionUser | null>;
    forwardVerifyComplete: (
        userId: string,
        params: IdentitySessionCompleteRequest,
        request: Request,
    ) => Promise<ForwardResult>;
};

function badRequest(message: string) {
    return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value as Record<string, unknown>;
}

export async function handleIdentitySessionComplete(
    request: Request,
    deps: IdentitySessionCompleteDeps,
): Promise<Response> {
    const user = await deps.getSessionUser();
    if (!user) {
        return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = IdentitySessionCompleteRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
        return badRequest(parsed.error.issues[0]?.message || 'Invalid identity completion payload');
    }

    const upstream = await deps.forwardVerifyComplete(user.id, parsed.data, request);
    if (upstream.status >= 400) {
        return Response.json(asObject(upstream.payload), { status: upstream.status });
    }

    const completion = IdentitySessionCompleteResponseSchema.safeParse(upstream.payload);
    if (!completion.success) {
        return Response.json(
            {
                error: 'IDENTITY_COMPLETE_CONTRACT_MISMATCH',
                message: completion.error.issues[0]?.message || 'Invalid identity completion response',
            },
            { status: 500 },
        );
    }

    const payload = {
        ...completion.data,
        next_step: completion.data.next_step || 'LIVENESS',
    };
    return Response.json(payload);
}
