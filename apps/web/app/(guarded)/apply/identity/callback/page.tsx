'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeIdentityVerificationSession } from '@/lib/admission-client';
import { parseStatusContract, getStatusStage } from '@/lib/contracts/status-contract';
import { getExpectedRoute } from '@/lib/stageRoutes';
import {
    RecoverableErrorPanel,
    Skeleton,
    SuccessNextStepPanel,
    Toast,
} from '@/components/ui-kit';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowInset,
    FlowPageHeader,
    FlowPagePanel,
    FlowPageShell,
    ReferenceDetailsCard,
} from '@/components/screen-patterns';

const IDENTITY_PROFILE_CACHE_KEY = 'admission.identity.profile.v1';

type FlowState = 'RUNNING' | 'SUCCESS' | 'ERROR';

type CachedIdentityProfile = {
    name?: string;
    phone?: string;
};

function readCachedIdentityProfile(): CachedIdentityProfile {
    if (typeof window === 'undefined') {
        return {};
    }
    const raw = window.sessionStorage.getItem(IDENTITY_PROFILE_CACHE_KEY);
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw) as CachedIdentityProfile;
        return {
            name: typeof parsed.name === 'string' ? parsed.name : undefined,
            phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
        };
    } catch {
        return {};
    }
}

function clearCachedIdentityProfile() {
    if (typeof window === 'undefined') {
        return;
    }
    window.sessionStorage.removeItem(IDENTITY_PROFILE_CACHE_KEY);
}

function getIdentityCallbackErrorMessage(error: string | null) {
    switch (error) {
        case 'CALLBACK_ID_MISSING':
            return 'We could not find the identity verification callback ID. Restart the identity step and try again.';
        case 'IDENTITY_CALLBACK_COMPLETE_FAILED':
            return 'We could not finalize the identity callback. Try the step again or return to the identity screen.';
        default:
            return error ? `We could not finalize the identity callback: ${error}` : 'We could not finalize the identity callback.';
    }
}

function resolveIdentityVerificationId(params: URLSearchParams | null): string | null {
    if (!params) return null;
    const direct = params.get('identityVerificationId');
    if (direct && direct.trim().length > 0) {
        return direct.trim();
    }
    const snake = params.get('identity_verification_id');
    if (snake && snake.trim().length > 0) {
        return snake.trim();
    }
    return null;
}

async function resolveAuthoritativeNextRoute(): Promise<string> {
    const statusResponse = await fetch('/api/me/status', { cache: 'no-store' });
    const payload = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) {
        return '/apply/status';
    }
    const status = parseStatusContract(payload);
    const stage = getStatusStage(status);
    return stage ? getExpectedRoute(stage) : '/apply/status';
}

export default function ApplyIdentityCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const identityVerificationId = useMemo(() => resolveIdentityVerificationId(searchParams), [searchParams]);
    const [state, setState] = useState<FlowState>('RUNNING');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [nextRoute, setNextRoute] = useState<string>('/apply/status');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!identityVerificationId) {
                if (!cancelled) {
                    setState('ERROR');
                    setErrorMessage('CALLBACK_ID_MISSING');
                    setToast({ text: 'The callback did not include an identity verification ID.', type: 'error' });
                }
                return;
            }

            try {
                const cached = readCachedIdentityProfile();
                await completeIdentityVerificationSession({
                    identityVerificationId,
                    name: cached.name,
                    phone: cached.phone,
                });
                clearCachedIdentityProfile();

                const route = await resolveAuthoritativeNextRoute();
                if (cancelled) return;
                setNextRoute(route);
                setState('SUCCESS');
                setToast({ text: 'Identity verification is complete. We’re refreshing your status and preparing the next step.', type: 'success' });

                window.setTimeout(() => {
                    if (!cancelled) {
                        router.replace(route);
                    }
                }, 700);
            } catch (error: unknown) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'IDENTITY_CALLBACK_COMPLETE_FAILED';
                setState('ERROR');
                setErrorMessage(message);
                setToast({ text: `Identity callback failed: ${message}`, type: 'error' });
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [identityVerificationId, router]);

    if (state === 'RUNNING') {
        return (
            <FlowPageShell>
                {toast && <Toast message={toast.text} type={toast.type} />}
                <FlowPagePanel>
                    <FlowPageHeader
                        title="Finishing identity verification"
                        description="We’re confirming the provider callback, saving the result, and refreshing your authoritative status."
                    />

                    <FlowInfoGrid className="mt-4">
                        <FlowInfoCard
                            title="What happens now"
                            description="We complete the verification session, refresh your status, and route you to the right next screen."
                        />
                        <FlowInfoCard
                            title="What happens next"
                            description="Once the callback is confirmed, the next admission step opens automatically."
                        />
                    </FlowInfoGrid>

                    <div className="mt-4">
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Verification ID', value: identityVerificationId || 'Not available' },
                            ]}
                        />
                    </div>

                    <FlowInset title="Why this can take a moment" className="mt-4">
                        We do not trust the provider callback alone. The next screen is chosen only after the authoritative status response is refreshed.
                    </FlowInset>

                    <Skeleton lines={5} className="mt-5" />
                </FlowPagePanel>
            </FlowPageShell>
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}
            <FlowPagePanel>
                <FlowPageHeader
                    title={state === 'SUCCESS' ? 'Identity verification complete' : 'Identity callback needs attention'}
                    description={
                        state === 'SUCCESS'
                            ? 'Your identity result is confirmed and the next stage is ready.'
                            : 'The callback could not be finalized. Use the recovery action below to continue safely.'
                    }
                />

                {state === 'SUCCESS' ? (
                    <div className="mt-4 space-y-4">
                        <SuccessNextStepPanel
                            title="Identity verification is complete"
                            description="We refreshed your status and prepared the next route."
                            primaryHref={nextRoute}
                            primaryLabel="Continue to the next step"
                            secondaryHref="/apply/status"
                            secondaryLabel="Open status"
                        />
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Verification ID', value: identityVerificationId || 'Not available' },
                                { label: 'Next route', value: nextRoute },
                            ]}
                        />
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <RecoverableErrorPanel
                            title="We couldn’t finish the identity callback"
                            message={getIdentityCallbackErrorMessage(errorMessage)}
                            retryLabel="Retry callback"
                            onRetry={() => window.location.reload()}
                            secondaryHref="/apply/identity"
                            secondaryLabel="Back to identity"
                        />
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Verification ID', value: identityVerificationId || 'Not available' },
                                { label: 'Error code', value: errorMessage || 'IDENTITY_CALLBACK_COMPLETE_FAILED' },
                            ]}
                        />
                    </div>
                )}
            </FlowPagePanel>
        </FlowPageShell>
    );
}
