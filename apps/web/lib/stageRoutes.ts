import {
    ADMISSION_STAGES,
    isAdmissionStage,
    normalizeAdmissionStage,
    type AdmissionStage as Stage,
} from './contracts/status-stages.ts';

export const STAGE_ROUTES = {
    [ADMISSION_STAGES.LOGIN]: '/login',
    [ADMISSION_STAGES.APPLY_START]: '/apply',
    [ADMISSION_STAGES.IDENTITY]: '/apply/identity',
    [ADMISSION_STAGES.LIVENESS]: '/apply/liveness',
    [ADMISSION_STAGES.CONSENTS]: '/apply/contracts',
    [ADMISSION_STAGES.DOCUMENTS]: '/apply/documents',
    [ADMISSION_STAGES.AI_DECISION]: '/apply/review',
    [ADMISSION_STAGES.RESUBMIT_REQUIRED]: '/apply/documents',
    [ADMISSION_STAGES.REJECTED]: '/apply/status',
    [ADMISSION_STAGES.EXCEPTION_REVIEW]: '/apply/status',
    [ADMISSION_STAGES.APPEAL_PENDING]: '/apply/status',
    [ADMISSION_STAGES.AUDIT_REVIEW]: '/apply/status',
    [ADMISSION_STAGES.APPROVED]: '/apply/status',
    [ADMISSION_STAGES.SOUL_ISSUED]: '/apply/status',
    [ADMISSION_STAGES.ACTIVE]: '/dashboard',
} as const satisfies Record<Stage, string>;

export const ACTIVE_SURFACE_ROUTES = [
    '/dashboard',
    '/wallet',
    '/match',
    '/chat',
    '/review',
    '/report',
    '/revoke',
    '/collateral',
    '/challenge',
    '/claim',
    '/unlock',
] as const;

const STATUS_ROUTE = '/apply/status';

const STAGE_ALLOWED_EXACT_ROUTES: Record<Stage, readonly string[]> = {
    [ADMISSION_STAGES.LOGIN]: [STAGE_ROUTES[ADMISSION_STAGES.LOGIN]],
    [ADMISSION_STAGES.APPLY_START]: [
        STAGE_ROUTES[ADMISSION_STAGES.APPLY_START],
        STATUS_ROUTE,
        STAGE_ROUTES[ADMISSION_STAGES.IDENTITY],
    ],
    [ADMISSION_STAGES.IDENTITY]: [
        STAGE_ROUTES[ADMISSION_STAGES.IDENTITY],
        STATUS_ROUTE,
        '/apply/identity/callback',
    ],
    [ADMISSION_STAGES.LIVENESS]: [
        STAGE_ROUTES[ADMISSION_STAGES.LIVENESS],
        STATUS_ROUTE,
        '/apply/identity/callback',
        '/apply/liveness/callback',
    ],
    [ADMISSION_STAGES.CONSENTS]: [
        STAGE_ROUTES[ADMISSION_STAGES.CONSENTS],
        STATUS_ROUTE,
        '/apply/liveness/callback',
    ],
    [ADMISSION_STAGES.DOCUMENTS]: [
        STAGE_ROUTES[ADMISSION_STAGES.DOCUMENTS],
        STATUS_ROUTE,
    ],
    [ADMISSION_STAGES.AI_DECISION]: [
        STAGE_ROUTES[ADMISSION_STAGES.AI_DECISION],
        STATUS_ROUTE,
    ],
    [ADMISSION_STAGES.RESUBMIT_REQUIRED]: [
        STAGE_ROUTES[ADMISSION_STAGES.RESUBMIT_REQUIRED],
        STATUS_ROUTE,
        '/apply/appeal',
    ],
    [ADMISSION_STAGES.REJECTED]: [
        STAGE_ROUTES[ADMISSION_STAGES.REJECTED],
        '/apply/appeal',
    ],
    [ADMISSION_STAGES.EXCEPTION_REVIEW]: [
        STAGE_ROUTES[ADMISSION_STAGES.EXCEPTION_REVIEW],
        '/apply/appeal',
    ],
    [ADMISSION_STAGES.APPEAL_PENDING]: [
        STAGE_ROUTES[ADMISSION_STAGES.APPEAL_PENDING],
        '/apply/appeal',
    ],
    [ADMISSION_STAGES.AUDIT_REVIEW]: [
        STAGE_ROUTES[ADMISSION_STAGES.AUDIT_REVIEW],
    ],
    [ADMISSION_STAGES.APPROVED]: [
        STAGE_ROUTES[ADMISSION_STAGES.APPROVED],
    ],
    [ADMISSION_STAGES.SOUL_ISSUED]: [
        STAGE_ROUTES[ADMISSION_STAGES.SOUL_ISSUED],
    ],
    [ADMISSION_STAGES.ACTIVE]: ACTIVE_SURFACE_ROUTES,
};

export type { Stage };

type StatusShape = {
    stage?: unknown;
    step?: unknown;
};

export function isStage(value: string): value is Stage {
    return isAdmissionStage(value) && Object.prototype.hasOwnProperty.call(STAGE_ROUTES, value);
}

export function normalizeStage(value: string | null | undefined): Stage | null {
    return normalizeAdmissionStage(value);
}

export function resolveStatusStage(status: StatusShape | null | undefined): Stage | null {
    const stage = typeof status?.stage === 'string' ? status.stage : null;
    const step = typeof status?.step === 'string' ? status.step : null;
    return normalizeStage(stage) || normalizeStage(step);
}

export function getExpectedRoute(stage: Stage): string {
    return STAGE_ROUTES[stage];
}

export function getAllowedRoutes(stage: Stage): readonly string[] {
    return STAGE_ALLOWED_EXACT_ROUTES[stage];
}

function isRouteOrDescendant(pathname: string, route: string): boolean {
    return pathname === route || pathname.startsWith(`${route}/`);
}

export function isActiveSurfaceRoute(pathname: string): boolean {
    return ACTIVE_SURFACE_ROUTES.some((route) => isRouteOrDescendant(pathname, route));
}

export function isAllowedStageRoute(stage: Stage, pathname: string): boolean {
    if (stage === ADMISSION_STAGES.ACTIVE) {
        return isActiveSurfaceRoute(pathname);
    }
    return getAllowedRoutes(stage).includes(pathname);
}

export function isAllowedSiblingRoute(stage: Stage, pathname: string): boolean {
    return isAllowedStageRoute(stage, pathname);
}

export function resolveGuardRedirect(params: {
    pathname: string;
    stage: Stage | null;
    isFrozen: boolean;
}): string | null {
    if (params.isFrozen && params.pathname !== '/banned') {
        return '/banned';
    }

    if (!params.isFrozen && params.pathname === '/banned') {
        return params.stage ? getExpectedRoute(params.stage) : '/apply';
    }

    if (params.pathname === '/banned' || !params.stage) {
        return null;
    }

    const expected = getExpectedRoute(params.stage);
    if (!isAllowedStageRoute(params.stage, params.pathname)) {
        return expected;
    }
    return null;
}

export const PUBLIC_ROUTES = ['/login', '/signup', '/manual', '/terms', '/privacy'] as const;
