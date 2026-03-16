import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { completeActiveMeeting } from '@/lib/server/active-core';

const CompleteSchema = z.object({
    match_id: z.string().uuid(),
});

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = CompleteSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'match_id is required' }, { status: 400 });
        }

        const admin = getServiceRoleClient();
        const result = await completeActiveMeeting(admin, user.id, parsed.data.match_id);

        return NextResponse.json({ source: 'API', data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message.startsWith('MATCH_NOT_FOUND') ? 404 : 500;
        return NextResponse.json({ error: 'ACTIVE_MEETING_COMPLETE_FAILED', message }, { status });
    }
}
