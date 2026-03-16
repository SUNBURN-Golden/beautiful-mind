export class RouteServiceError extends Error {
    readonly code: string;

    readonly status: number;

    constructor(code: string, status: number, message?: string) {
        super(message || code);
        this.name = 'RouteServiceError';
        this.code = code;
        this.status = status;
    }
}

export function isRouteServiceError(error: unknown): error is RouteServiceError {
    return error instanceof RouteServiceError;
}
