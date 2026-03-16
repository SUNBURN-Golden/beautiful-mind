'use client';

import {
    FeedbackPanel,
    Input,
    PageLoadingState,
    PrimaryButton,
    RecoverableErrorPanel,
    StageTransitionNotice,
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
} from '@/components/screen-patterns';
import { useIdentitySession } from './useIdentitySession';

export default function ApplyIdentityPage() {
    const {
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
        clearLastError,
        handleStartSession,
    } = useIdentitySession();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing identity verification"
                description="We're syncing your current stage and verification readiness."
                lines={4}
            />
        );
    }

    if (stage && !['APPLY_START', 'IDENTITY'].includes(stage)) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We're taking you to identity verification"
                description="Your source-of-truth stage points to a different screen, so we're routing you there."
            />
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={1}
                    totalSteps={5}
                    title="Identity verification"
                    description="We record only the minimum identity result needed for admission, then move you into liveness verification."
                />

                <FlowInfoGrid className="mt-4">
                    <FlowInfoCard
                        title="Why this step matters"
                        description="It creates a verified baseline for admission and helps block impersonation before the rest of the flow."
                    />
                    <FlowInfoCard
                        title="How to recover"
                        description="Retry the session if it expires or fails. If the provider flow keeps failing, use the manual guide before you try again."
                    />
                </FlowInfoGrid>

                <FlowInset className="mt-3">
                    Starting the PortOne session opens the provider verification flow.
                    Once that step finishes, the callback screen refreshes your status and guides you to the next stage.
                </FlowInset>

                {handoffMessage && (
                    <div className="mt-4">
                        <SuccessNextStepPanel
                            title="Identity verification is ready"
                            description={handoffMessage}
                            primaryHref="/apply/identity/callback"
                            primaryLabel="Check callback status"
                            secondaryHref="/apply/status"
                            secondaryLabel="Open status"
                        />
                    </div>
                )}

                {lastError && (
                    <div className="mt-4">
                        <RecoverableErrorPanel
                            title="We couldn't start identity verification"
                            message={lastError}
                            retryLabel="Dismiss"
                            onRetry={clearLastError}
                            secondaryHref="/manual"
                            secondaryLabel="Open guide"
                        />
                    </div>
                )}

                <form className="mt-7" onSubmit={handleStartSession}>
                    <Input
                        label="Name (optional)"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Jordan Kim"
                        disabled={starting}
                    />

                    <Input
                        label="Phone number (optional)"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="01012345678"
                        disabled={starting}
                    />

                    <div className="mt-6 flex flex-wrap gap-3">
                        <PrimaryButton type="submit" submitting={starting} disabled={starting}>
                            Start identity check
                        </PrimaryButton>
                    </div>
                    <div className="mt-3">
                        <FeedbackPanel
                            tone="info"
                            title="After the session starts"
                            description="Once the provider flow finishes, the callback route (`/apply/identity/callback`) completes the step automatically."
                        />
                    </div>
                </form>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
