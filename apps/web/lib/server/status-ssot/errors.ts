import { NextResponse } from 'next/server';

export type StatusErrorCode =
    | 'AUTH_REQUIRED'
    | 'BANNED'
    | 'INTERNAL_SERVER_ERROR'
    | 'SERVER_MISCONFIG';

export function errorResponse(
    code: StatusErrorCode,
    message: string,
    status: number,
    details?: unknown,
) {
    return NextResponse.json(
        { error: { code, message }, ...(details ? { details } : {}) },
        { status },
    );
}

export function internalServerError(err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return errorResponse('INTERNAL_SERVER_ERROR', message, 500);
}
