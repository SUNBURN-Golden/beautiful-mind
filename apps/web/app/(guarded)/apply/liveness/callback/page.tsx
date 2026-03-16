'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchLivenessVerificationSessionResult } from '@/lib/admission-client';
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

type FlowState = 'RUNNING' | 'SUCCESS' | 'ERROR';

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getLivenessCallbackErrorMessage(error: string | null) {
    switch (error) {
        case 'LIVENESS_SESSION_ID_MISSING':
            return 'We could not find the liveness session ID in the callback. Restart the liveness step and try again.';
        case 'LIVENESS_RESULT_TIMEOUT':
            return 'The liveness result took too long to finalize. Refresh the callback or return to the liveness step.';
        default:
            return error ? `We could not confirm the liveness result: ${error}` : 'We could not confirm the liveness result.';
    }
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

export default function ApplyLivenessCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = useMemo(() => (searchParams?.get('session_id') || '').trim(), [searchParams]);

    const [state, setState] = useState<FlowState>('RUNNING');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [nextRoute, setNextRoute] = useState<string>('/apply/status');
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!sessionId) {
                setState('ERROR');
                setErrorMessage('LIVENESS_SESSION_ID_MISSING');
                setToast({ text: 'The callback did not include a liveness session ID.', type: 'error' });
                return;
            }

            const startedAt = Date.now();
            const timeoutMs = 30_000;
            setToast({ text: 'We’re confirming the liveness result now.', type: 'info' });

            try {
                while (!cancelled) {
                    const result = await fetchLivenessVerificationSessionResult({ session_id: sessionId });
                    if (result.status === 'VERIFIED' && result.verified) {
                        const route = await resolveAuthoritativeNextRoute();
                        if (cancelled) return;
                        setNextRoute(route);
                        setState('SUCCESS');
                        setToast({ text: 'Liveness verification is confirmed. We’re preparing the next step.', type: 'success' });
                        window.setTimeout(() => {
                            if (!cancelled) {
                                router.replace(route);
                            }
                        }, 700);
                        return;
                    }

                    if (result.status === 'FAILED' || result.status === 'EXPIRED') {
                        throw new Error(result.message || `LIVENESS_${result.status}`);
                    }

                    if (Date.now() - startedAt > timeoutMs) {
                        throw new Error('LIVENESS_RESULT_TIMEOUT');
                    }

                    await sleep(1500);
                }
            } catch (error: unknown) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'LIVENESS_RESULT_FAILED';
                setState('ERROR');
                setErrorMessage(message);
                setToast({ text: `Liveness result processing failed: ${message}`, type: 'error' });
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [router, sessionId]);

    if (state === 'RUNNING') {
        return (
            <FlowPageShell>
                {toast && <Toast message={toast.text} type={toast.type} />}
                <FlowPagePanel>
                    <FlowPageHeader
                        title="Confirming your liveness result"
                        description="We’re polling the verification result, then refreshing your authoritative admission status before we move you forward."
                    />

                    <FlowInfoGrid className="mt-4">
                        <FlowInfoCard
                            title="What happens now"
                            description="We keep checking the liveness session until the result is verified, fails, expires, or times out."
                        />
                        <FlowInfoCard
                            title="What happens next"
                            description="Once the result is confirmed, the next admission route opens automatically from the authoritative status source."
                        />
                    </FlowInfoGrid>

                    <div className="mt-4">
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Session ID', value: sessionId || 'Not available' },
                            ]}
                        />
                    </div>

                    <FlowInset title="Why this can take a moment" className="mt-4">
                        The callback waits for the actual verification result, not just the return from the provider. That keeps the next step aligned with the real status source.
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
                    title={state === 'SUCCESS' ? 'Liveness verification complete' : 'Liveness callback needs attention'}
                    description={
                        state === 'SUCCESS'
                            ? 'Your liveness result is confirmed and the next step is ready.'
                            : 'We could not finalize the callback result. Use the recovery action below to continue safely.'
                    }
                />

                {state === 'SUCCESS' ? (
                    <div className="mt-4 space-y-4">
                        <SuccessNextStepPanel
                            title="Liveness verification is complete"
                            description="We refreshed your status and prepared the next route."
                            primaryHref={nextRoute}
                            primaryLabel="Continue to the next step"
                            secondaryHref="/apply/status"
                            secondaryLabel="Open status"
                        />
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Session ID', value: sessionId || 'Not available' },
                                { label: 'Next route', value: nextRoute },
                            ]}
                        />
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <RecoverableErrorPanel
                            title="We couldn’t finish the liveness callback"
                            message={getLivenessCallbackErrorMessage(errorMessage)}
                            retryLabel="Refresh callback"
                            onRetry={() => window.location.reload()}
                            secondaryHref="/apply/liveness"
                            secondaryLabel="Back to liveness"
                        />
                        <ReferenceDetailsCard
                            title="Callback reference"
                            rows={[
                                { label: 'Session ID', value: sessionId || 'Not available' },
                                { label: 'Error code', value: errorMessage || 'LIVENESS_RESULT_FAILED' },
                            ]}
                        />
                    </div>
                )}
            </FlowPagePanel>
        </FlowPageShell>
    );
}
