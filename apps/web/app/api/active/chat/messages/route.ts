import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { listChatMessages, sendChatMessage } from '@/lib/server/active-core';
import { handleActiveChatGet, handleActiveChatPost } from '@/lib/server/active-chat-handler';

export async function GET(req: Request) {
    return handleActiveChatGet(req, {
        getSessionUser,
        getServiceRoleClient,
        listChatMessages,
        sendChatMessage,
    });
}

export async function POST(req: Request) {
    return handleActiveChatPost(req, {
        getSessionUser,
        getServiceRoleClient,
        listChatMessages,
        sendChatMessage,
    });
}
