import { LEGACY_REDIRECT_PREFIXES } from '../legacy-routes.ts';

export type MiddlewareRedirectDecision = {
    pathname: string;
    searchParams?: Record<string, string>;
};

export type MiddlewareRedirectInput = {
    pathname: string;
    hasPublicEnv: boolean;
    hasUser: boolean;
    isAdmin?: boolean;
    isBanned?: boolean;
    isFrozen?: boolean;
    isActive?: boolean;
};

export const PROTECTED_PREFIXES = [
    '/dashboard',
    '/apply',
    '/onboarding',
    '/contract',
    '/consent',
    '/interview',
    '/osint',
    '/admin-verify',
    '/match',
    '/chat',
    '/review',
    '/report',
    '/revoke',
    '/banned',
] as const;

export const ACTIVE_ONLY_PREFIXES = ['/dashboard', '/match', '/chat', '/review', '/report', '/revoke'] as const;
export const AUTH_ENTRY_PREFIXES = ['/login', '/signup'] as const;

function isRoutePrefixed(pathname: string, prefixes: readonly string[]): boolean {
    return prefixes.some((route) => pathname.startsWith(route));
}

export function resolveMiddlewareRedirect(input: MiddlewareRedirectInput): MiddlewareRedirectDecision | null {
    const isProtectedRoute = isRoutePrefixed(input.pathname, PROTECTED_PREFIXES);
    const isAdminRoute = input.pathname.startsWith('/admin');
    const isActive = input.isActive === true;
    const isFrozen = input.isFrozen === true;
    const isAdmin = input.isAdmin === true;
    const isBanned = input.isBanned === true;

    if (!input.hasPublicEnv) {
        if (isProtectedRoute || isAdminRoute) {
            return {
                pathname: '/login',
                searchParams: { error: 'SERVER_MISCONFIG' },
            };
        }
        return null;
    }

    if (!input.hasUser) {
        if (isProtectedRoute || isAdminRoute) {
            return { pathname: '/login' };
        }
        return null;
    }

    if (isBanned) {
        return {
            pathname: '/login',
            searchParams: { error: 'ACCOUNT_BANNED' },
        };
    }

    if (isFrozen && input.pathname !== '/banned') {
        return { pathname: '/banned' };
    }

    if (!isFrozen && input.pathname === '/banned') {
        return { pathname: isActive ? '/dashboard' : '/apply/status' };
    }

    if (isAdminRoute && !isAdmin) {
        return { pathname: '/' };
    }

    if (isRoutePrefixed(input.pathname, AUTH_ENTRY_PREFIXES)) {
        return { pathname: isActive ? '/dashboard' : '/apply/status' };
    }

    if (isRoutePrefixed(input.pathname, ACTIVE_ONLY_PREFIXES) && !isActive) {
        return { pathname: '/apply/status' };
    }

    if (input.pathname.startsWith('/apply') && isActive) {
        return { pathname: '/dashboard' };
    }

    if (isRoutePrefixed(input.pathname, LEGACY_REDIRECT_PREFIXES)) {
        return { pathname: isActive ? '/dashboard' : '/apply/status' };
    }

    return null;
}
