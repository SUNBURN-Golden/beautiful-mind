import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import {
    verifyLivenessForUser,
    LivenessVerificationPayloadSchema as LivenessSchema,
} from '@/lib/server/admission-liveness-verify';

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = LivenessSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'BAD_REQUEST', message: 'Invalid liveness payload' },
                { status: 400 },
            );
        }

        const admin = getServiceRoleClient();
        const result = await verifyLivenessForUser(admin, user.id, parsed.data, () => new Date());
        return NextResponse.json(result.payload, { status: result.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
