'use client';

import {
    FeedbackPanel,
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
    ReferenceDetailsCard,
} from '@/components/screen-patterns';
import { useLivenessFlow } from './useLivenessFlow';

function getLivenessErrorMessage(error: string | null) {
    switch (error) {
        case 'CAMERA_NOT_SUPPORTED':
            return 'This device or browser cannot open a camera session for liveness verification.';
        case 'CAPTURE_FRAME_UNAVAILABLE':
            return 'We could not capture a usable frame. Try the camera again once the preview is stable.';
        case 'CANVAS_CONTEXT_UNAVAILABLE':
            return 'The capture surface could not be prepared. Try the session again.';
        default:
            return error || 'Please try this step again.';
    }
}

export default function ApplyLivenessPage() {
    const {
        stage,
        isLoading,
        videoRef,
        session,
        cameraState,
        capturePreview,
        captureHash,
        captureSize,
        purgeConfirmed,
        starting,
        submitting,
        lastError,
        toast,
        setPurgeConfirmed,
        clearLastError,
        handleStartSession,
        handleCapture,
        handleRetake,
        handleSubmitCapture,
    } = useLivenessFlow();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your liveness check"
                description="We’re syncing your current stage and camera-verification status."
                lines={4}
            />
        );
    }

    if (stage && stage !== 'LIVENESS') {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to your current liveness step"
                description="Your status source of truth points to a different step, so we’re routing you there."
            />
        );
    }

    return (
        <FlowPageShell>
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={2}
                    totalSteps={5}
                    title="Liveness check"
                    description="We verify first. Confirm that you are a real person through a short camera capture. We retain only the verification result and minimal claims."
                />

                <FlowInfoGrid className="mt-4">
                    <FlowInfoCard
                        title="What you do now"
                        description="Start a camera session, take one clear capture, and submit it for verification."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="After verification completes, the flow continues to consent confirmations."
                    />
                </FlowInfoGrid>

                <FlowInset title="Safer because less remains." className="mt-3">
                    This step runs through a short camera session. Original capture media is not kept long term; only the verification outcome and minimal claims remain.
                </FlowInset>

                {lastError && (
                    <div className="mt-4">
                        <RecoverableErrorPanel
                            title="We couldn’t finish this liveness step"
                            message={getLivenessErrorMessage(lastError)}
                            retryLabel="Dismiss"
                            onRetry={clearLastError}
                            secondaryHref="/manual"
                            secondaryLabel="Open the guide"
                        />
                    </div>
                )}

                <form className="mt-7" onSubmit={handleStartSession}>
                    {!session && (
                        <div className="space-y-4">
                            <FlowInset title="Proof before connection." className="border-[#e5e5e7] bg-white">
                                Identity verification must already be complete. Once the session starts, we’ll request camera access and guide you into capture.
                            </FlowInset>
                            <PrimaryButton type="submit" submitting={starting} disabled={starting}>
                                Start camera session
                            </PrimaryButton>
                        </div>
                    )}

                    {session && (
                        <div className="space-y-5">
                            <ReferenceDetailsCard
                                title="Session reference"
                                rows={[
                                    { label: 'Session ID', value: session.session_id },
                                    { label: 'Mode', value: session.mode },
                                ]}
                            />

                            {cameraState === 'READY' && (
                                <div className="rounded-2xl border border-[#e5e5e7] bg-white p-4">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="h-[320px] w-full rounded-xl bg-black object-cover sm:h-[360px]"
                                    />
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <PrimaryButton type="button" onClick={handleCapture}>
                                            Capture now
                                        </PrimaryButton>
                                    </div>
                                </div>
                            )}

                            {cameraState === 'CAPTURED' && capturePreview && (
                                <div className="rounded-2xl border border-[#e5e5e7] bg-white p-4">
                                    <img
                                        src={capturePreview}
                                        alt="Liveness capture preview"
                                        className="h-[320px] w-full rounded-xl object-cover sm:h-[360px]"
                                    />
                                    <div className="mt-3">
                                        <ReferenceDetailsCard
                                            title="Capture reference"
                                            rows={[
                                                { label: 'Capture hash', value: captureHash },
                                                {
                                                    label: 'Resolution',
                                                    value: captureSize ? `${captureSize.width} × ${captureSize.height}` : 'Not available',
                                                },
                                            ]}
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <PrimaryButton type="button" onClick={handleRetake} disabled={submitting}>
                                            Retake capture
                                        </PrimaryButton>
                                        <PrimaryButton
                                            type="button"
                                            submitting={submitting}
                                            onClick={handleSubmitCapture}
                                            disabled={submitting || !purgeConfirmed}
                                        >
                                            Submit capture
                                        </PrimaryButton>
                                    </div>
                                </div>
                            )}

                            {cameraState === 'ERROR' && (
                                <FeedbackPanel
                                    tone="error"
                                    title="Camera capture is unavailable"
                                    description="Check camera permission, then try the session again."
                                />
                            )}

                            <label className="flex items-start gap-3 text-[14px] text-slate-700">
                                <input
                                    id="liveness-purge-consent"
                                    type="checkbox"
                                    className="liquid-checkbox mt-1"
                                    checked={purgeConfirmed}
                                    onChange={(event) => setPurgeConfirmed(event.target.checked)}
                                    disabled={submitting}
                                    aria-describedby="liveness-purge-help"
                                />
                                <span id="liveness-purge-help">I agree to immediate purge of the original capture and retention of minimal claims only.</span>
                            </label>

                            {!purgeConfirmed && (
                                <div className="mt-1">
                                    <FeedbackPanel
                                        tone="warning"
                                        title="Purge consent is still required"
                                        description="Confirm the retention policy before you submit this capture."
                                    />
                                </div>
                            )}
                            {!captureHash && (
                                <div className="mt-3">
                                    <FeedbackPanel
                                        tone="info"
                                        title="A capture is still needed"
                                        description="Take a clear camera capture before you submit this step."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <div className="mt-4">
                    <SuccessNextStepPanel
                        title="After verification"
                        description="Use the callback screen to confirm the result, then move on to consent confirmations."
                        primaryHref="/apply/liveness/callback"
                        primaryLabel="Open callback status"
                        secondaryHref="/apply/status"
                        secondaryLabel="View status"
                    />
                </div>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
