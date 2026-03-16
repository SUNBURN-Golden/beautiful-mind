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
    [ADMISSION_STAGES.CONSENTS]: '/apply/consents',
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

export type { Stage };

type StatusShape = {
    stage?: unknown;
    step?: unknown;
};

const STATUS_SCREEN_ALLOWED_STAGES: Stage[] = [ADMISSION_STAGES.LOGIN, ADMISSION_STAGES.ACTIVE];
const IDENTITY_CALLBACK_ALLOWED_STAGES: Stage[] = [
    ADMISSION_STAGES.APPLY_START,
    ADMISSION_STAGES.IDENTITY,
    ADMISSION_STAGES.LIVENESS,
];
const LIVENESS_CALLBACK_ALLOWED_STAGES: Stage[] = [
    ADMISSION_STAGES.LIVENESS,
    ADMISSION_STAGES.CONSENTS,
];
const APPEAL_ALLOWED_STAGES: Stage[] = [
    ADMISSION_STAGES.REJECTED,
    ADMISSION_STAGES.RESUBMIT_REQUIRED,
    ADMISSION_STAGES.EXCEPTION_REVIEW,
    ADMISSION_STAGES.APPEAL_PENDING,
];

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

export function isAllowedSiblingRoute(stage: Stage, pathname: string): boolean {
    if (pathname === '/apply/status' && !STATUS_SCREEN_ALLOWED_STAGES.includes(stage)) {
        return true;
    }

    if (stage === ADMISSION_STAGES.APPLY_START && pathname === '/apply/identity') {
        return true;
    }

    if (
        IDENTITY_CALLBACK_ALLOWED_STAGES.includes(stage)
        && pathname === '/apply/identity/callback'
    ) {
        return true;
    }

    if (LIVENESS_CALLBACK_ALLOWED_STAGES.includes(stage) && pathname === '/apply/liveness/callback') {
        return true;
    }

    if (APPEAL_ALLOWED_STAGES.includes(stage) && pathname === '/apply/appeal') {
        return true;
    }

    if (stage === ADMISSION_STAGES.RESUBMIT_REQUIRED && pathname === '/apply/documents') {
        return true;
    }

    return false;
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
    if (params.pathname !== expected && !isAllowedSiblingRoute(params.stage, params.pathname)) {
        return expected;
    }
    return null;
}

export const PUBLIC_ROUTES = ['/login', '/signup', '/manual', '/terms', '/privacy'] as const;
