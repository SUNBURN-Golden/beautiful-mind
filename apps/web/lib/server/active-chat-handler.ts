import { z } from 'zod';

type SessionUser = {
    id: string;
};

const ChatQuerySchema = z.object({
    match_id: z.string().uuid(),
});

const SendMessageSchema = z.object({
    match_id: z.string().uuid(),
    content: z.string().trim().min(1).max(2000),
});

type ActiveChatHandlerDeps<TAdmin> = {
    getSessionUser: () => Promise<SessionUser | null>;
    getServiceRoleClient: () => TAdmin;
    listChatMessages: (admin: TAdmin, userId: string, matchId: string) => Promise<unknown>;
    sendChatMessage: (admin: TAdmin, userId: string, params: { matchId: string; content: string }) => Promise<unknown>;
};

export async function handleActiveChatGet<TAdmin>(
    request: Request,
    deps: ActiveChatHandlerDeps<TAdmin>,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const url = new URL(request.url);
        const parsed = ChatQuerySchema.safeParse({
            match_id: url.searchParams.get('match_id'),
        });
        if (!parsed.success) {
            return Response.json({ error: 'BAD_REQUEST', message: 'match_id is required' }, { status: 400 });
        }

        const admin = deps.getServiceRoleClient();
        const thread = await deps.listChatMessages(admin, user.id, parsed.data.match_id);
        return Response.json({ source: 'API', data: thread });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message.startsWith('MATCH_NOT_FOUND') ? 404 : 500;
        return Response.json({ error: 'ACTIVE_CHAT_LOAD_FAILED', message }, { status });
    }
}

export async function handleActiveChatPost<TAdmin>(
    request: Request,
    deps: ActiveChatHandlerDeps<TAdmin>,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = SendMessageSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return Response.json({ error: 'BAD_REQUEST', message: 'match_id and content are required' }, { status: 400 });
        }

        const admin = deps.getServiceRoleClient();
        const message = await deps.sendChatMessage(admin, user.id, {
            matchId: parsed.data.match_id,
            content: parsed.data.content,
        });

        return Response.json({ source: 'API', data: message });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.startsWith('MATCH_NOT_FOUND')) {
            return Response.json({ error: 'MATCH_NOT_FOUND', message }, { status: 404 });
        }
        if (message.startsWith('MATCH_INACTIVE')) {
            return Response.json({ error: 'MATCH_INACTIVE', message }, { status: 409 });
        }
        if (message.startsWith('MESSAGE_EMPTY')) {
            return Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });
        }
        return Response.json({ error: 'ACTIVE_CHAT_SEND_FAILED', message }, { status: 500 });
    }
}
