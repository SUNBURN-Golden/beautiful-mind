'use client';

import { useState } from 'react';
import { startIdentityVerificationSession } from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

export const IDENTITY_PROFILE_CACHE_KEY = 'admission.identity.profile.v1';

export function normalizePhoneDigits(value: string): string {
    return value.replace(/\D/g, '');
}

type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

export function useIdentitySession() {
    const { isLoading, currentStage } = useStatus();
    const stage = currentStage;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [starting, setStarting] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);

    const handleStartSession = async (event: React.FormEvent) => {
        event.preventDefault();
        setStarting(true);
        setToast(null);
        setLastError(null);
        setHandoffMessage(null);

        try {
            const normalizedPhone = normalizePhoneDigits(phone);
            const trimmedName = name.trim();
            const session = await startIdentityVerificationSession({
                name: trimmedName || undefined,
                phone: normalizedPhone || undefined,
            });

            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(
                    IDENTITY_PROFILE_CACHE_KEY,
                    JSON.stringify({
                        name: trimmedName || undefined,
                        phone: normalizedPhone || undefined,
                    }),
                );
            }

            if (session.session.mode === 'TEST_REDIRECT' && session.session.handoff_url) {
                setToast({ text: 'Redirecting to the test identity callback.', type: 'info' });
                window.location.assign(session.session.handoff_url);
                return;
            }

            const { requestIdentityVerification } = await import('@portone/browser-sdk/v2');
            const verificationResult = await requestIdentityVerification({
                storeId: session.session.store_id!,
                channelKey: session.session.channel_key!,
                identityVerificationId: session.session.identity_verification_id,
                redirectUrl: session.session.redirect_url,
                forceRedirect: true,
                customer: {
                    fullName: trimmedName || undefined,
                    phoneNumber: normalizedPhone || undefined,
                },
            });

            if (verificationResult?.identityVerificationId) {
                const callbackUrl = new URL(session.session.redirect_url);
                callbackUrl.searchParams.set('identityVerificationId', verificationResult.identityVerificationId);
                window.location.assign(callbackUrl.toString());
                return;
            }

            setHandoffMessage('The provider flow is open. Once it finishes, the callback screen will confirm the result and guide you forward.');
            setToast({ text: 'Identity verification session started.', type: 'info' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'IDENTITY_SESSION_START_FAILED';
            setToast({ text: `We couldn't start the identity verification session: ${message}`, type: 'error' });
            setLastError(message);
        } finally {
            setStarting(false);
        }
    };

    return {
        stage,
        isLoading,
        name,
        phone,
        starting,
        lastError,
        handoffMessage,
        toast,
        setName,
        setPhone,
        clearLastError: () => setLastError(null),
        handleStartSession,
    };
}
