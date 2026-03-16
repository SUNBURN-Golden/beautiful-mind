import { NextResponse } from 'next/server';
import { resolveStatusRequestContext } from '@/lib/server/status-ssot/context';
import { errorResponse, internalServerError } from '@/lib/server/status-ssot/errors';
import { fetchStatusInputs } from '@/lib/server/status-ssot/queries';
import { buildStatusResponse } from '@/lib/server/status-ssot/response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const context = await resolveStatusRequestContext(req);
        if (context instanceof Response) {
            return context;
        }

        const queryResult = await fetchStatusInputs(context.admin, context.userId);
        const { truth, profileError } = queryResult;
        if (profileError) {
            console.error('Profile fetch error:', profileError.message);
        }

        if (truth.profile?.banned) {
            return errorResponse('BANNED', 'User is permanently banned.', 403);
        }

        return NextResponse.json(buildStatusResponse(queryResult), { status: 200 });
    } catch (err: unknown) {
        return internalServerError(err);
    }
}
