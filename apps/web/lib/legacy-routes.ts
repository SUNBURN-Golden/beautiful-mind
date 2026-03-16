export const LEGACY_REDIRECT_PREFIXES = [
    '/onboarding',
    '/interview',
    '/contract',
    '/consent',
    '/osint',
    '/admin-verify',
] as const;

// Exact legacy entry URLs kept for compatibility redirect checks.
export const LEGACY_ENTRY_ROUTES = [
    '/onboarding',
    '/onboarding/help',
    '/onboarding/verify',
    '/onboarding/qualification',
    '/onboarding/consent',
    '/onboarding/sign',
    '/interview',
    '/contract',
    '/consent',
    '/osint',
    '/admin-verify',
] as const;

