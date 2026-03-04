export type Stage =
    | 'LOGIN'
    | 'KYC'
    | 'QUALIFICATION'
    | 'CONSENT_HUB'
    | 'E_SIGN'
    | 'AI_INTERVIEW'
    | 'DASHBOARD_READY';

export const STAGE_ROUTES: Record<Stage, string> = {
    LOGIN: '/login',
    KYC: '/onboarding/verify',
    QUALIFICATION: '/onboarding/qualification',
    CONSENT_HUB: '/onboarding/consent',
    E_SIGN: '/onboarding/sign',
    AI_INTERVIEW: '/interview',
    DASHBOARD_READY: '/dashboard',
};

export function getExpectedRoute(stage: Stage): string {
    return STAGE_ROUTES[stage] || '/login';
}

export const PUBLIC_ROUTES = ['/login'];
