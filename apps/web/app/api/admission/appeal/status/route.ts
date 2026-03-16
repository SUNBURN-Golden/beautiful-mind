import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { getLatestAppealStatus } from '@/lib/server/admission-appeal';

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const admin = getServiceRoleClient();
        const payload = await getLatestAppealStatus(admin, user.id);

        return NextResponse.json({
            success: true,
            has_appeal: Boolean(payload),
            data: payload,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
