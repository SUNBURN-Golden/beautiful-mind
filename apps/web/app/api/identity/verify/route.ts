import { NextResponse } from 'next/server';

/**
 * @deprecated Legacy mock endpoint kept only for compatibility visibility.
 * Identity verification is now handled by:
 * - POST /api/admission/identity/session/start
 * - POST /api/admission/identity/session/complete
 */
export async function POST() {
    return NextResponse.json(
        {
            error: 'DEPRECATED_ROUTE',
            message: 'Use /api/admission/identity/session/start and /api/admission/identity/session/complete.',
        },
        { status: 410 },
    );
}
