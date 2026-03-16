'use server';

/**
 * @deprecated Legacy server action shim.
 * Use admission identity session routes:
 * - POST /api/admission/identity/session/start
 * - POST /api/admission/identity/session/complete
 */
export async function verifyIdentity() {
    return {
        success: false,
        error: 'DEPRECATED_IDENTITY_ACTION',
        message: 'Use admission identity session APIs instead of legacy server action.',
    };
}
