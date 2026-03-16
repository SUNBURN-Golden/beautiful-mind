import { NextResponse } from 'next/server';
import { assertAdminSession } from '@/lib/server/admin-auth';
import { listAdminAdmissionReviewCases } from '@/lib/server/admin-review-cases';
import { isRouteServiceError } from '@/lib/server/route-service-error';

export async function GET() {
    try {
        const auth = await assertAdminSession();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const result = await listAdminAdmissionReviewCases(auth.admin);

        return NextResponse.json({
            success: true,
            count: result.count,
            items: result.items,
        });
    } catch (error: unknown) {
        if (isRouteServiceError(error)) {
            return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
