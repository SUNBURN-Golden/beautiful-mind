import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminSession } from '@/lib/server/admin-auth';
import { getAdminAdmissionReviewCaseDetail } from '@/lib/server/admin-review-cases';
import { isRouteServiceError } from '@/lib/server/route-service-error';

const IdSchema = z.string().uuid();

export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await context.params;
        const parsedId = IdSchema.safeParse(id);
        if (!parsedId.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'invalid admission review id' }, { status: 400 });
        }

        const detail = await getAdminAdmissionReviewCaseDetail(auth.admin, parsedId.data);

        return NextResponse.json({
            success: true,
            ...detail,
        });
    } catch (error: unknown) {
        if (isRouteServiceError(error)) {
            const payload = error.code === 'NOT_FOUND'
                ? { error: error.code }
                : { error: error.code, message: error.message };
            return NextResponse.json(payload, { status: error.status });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
