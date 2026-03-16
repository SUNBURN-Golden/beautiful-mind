import { MatchesDataSchema } from '../contracts/active-stage-contract.ts';

type SessionUser = {
    id: string;
};

type ActiveMatchesHandlerDeps<TAdmin> = {
    getSessionUser: () => Promise<SessionUser | null>;
    getServiceRoleClient: () => TAdmin;
    listActiveMatches: (admin: TAdmin, userId: string) => Promise<unknown>;
};

export async function handleActiveMatchesGet<TAdmin>(
    _request: Request,
    deps: ActiveMatchesHandlerDeps<TAdmin>,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const admin = deps.getServiceRoleClient();
        const rawMatches = await deps.listActiveMatches(admin, user.id);
        const parsedMatches = MatchesDataSchema.safeParse(rawMatches);
        if (!parsedMatches.success) {
            return Response.json(
                { error: 'ACTIVE_MATCHES_CONTRACT_MISMATCH', message: parsedMatches.error.issues[0]?.message || 'Invalid matches payload' },
                { status: 500 },
            );
        }

        return Response.json({
            source: 'API',
            data: parsedMatches.data,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return Response.json({ error: 'ACTIVE_MATCHES_FAILED', message }, { status: 500 });
    }
}
