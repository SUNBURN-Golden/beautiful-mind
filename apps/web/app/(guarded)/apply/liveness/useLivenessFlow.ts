'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    completeLivenessVerificationSession,
    startLivenessVerificationSession,
    type LivenessProviderSessionStartResponse,
} from '@/lib/admission-client';
import { useStatus } from '@/lib/useStatus';

type CameraState = 'IDLE' | 'READY' | 'CAPTURED' | 'ERROR';
type ToastState = { text: string; type: 'success' | 'error' | 'info' } | null;

async function sha256Hex(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function useLivenessFlow() {
    const router = useRouter();
    const { isLoading, currentStage } = useStatus();
    const stage = currentStage;

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [session, setSession] = useState<LivenessProviderSessionStartResponse['session'] | null>(null);
    const [cameraState, setCameraState] = useState<CameraState>('IDLE');
    const [capturePreview, setCapturePreview] = useState<string | null>(null);
    const [captureHash, setCaptureHash] = useState<string | null>(null);
    const [captureSize, setCaptureSize] = useState<{ width: number; height: number } | null>(null);
    const [purgeConfirmed, setPurgeConfirmed] = useState(false);
    const [starting, setStarting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraState('ERROR');
            setLastError('CAMERA_NOT_SUPPORTED');
            return;
        }

        try {
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
            setCameraState('READY');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'CAMERA_ACCESS_FAILED';
            setCameraState('ERROR');
            setLastError(message);
        }
    }, [stopCamera]);

    useEffect(() => () => {
        stopCamera();
    }, [stopCamera]);

    const resetCaptureState = () => {
        setCapturePreview(null);
        setCaptureHash(null);
        setCaptureSize(null);
        setSession(null);
        setCameraState('IDLE');
    };

    const handleStartSession = async (event: React.FormEvent) => {
        event.preventDefault();
        setStarting(true);
        setToast(null);
        setLastError(null);
        resetCaptureState();

        try {
            const response = await startLivenessVerificationSession({ capture_mode: 'CAMERA' });
            setSession(response.session);
            setToast({ text: 'Your camera capture session is ready.', type: 'info' });
            await startCamera();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'LIVENESS_SESSION_START_FAILED';
            setToast({ text: `We couldn’t start the liveness session: ${message}`, type: 'error' });
            setLastError(message);
        } finally {
            setStarting(false);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current) return;
        const width = videoRef.current.videoWidth || 0;
        const height = videoRef.current.videoHeight || 0;
        if (!width || !height) {
            setLastError('CAPTURE_FRAME_UNAVAILABLE');
            setCameraState('ERROR');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            setLastError('CANVAS_CONTEXT_UNAVAILABLE');
            setCameraState('ERROR');
            return;
        }

        context.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const hash = await sha256Hex(dataUrl);
        setCapturePreview(dataUrl);
        setCaptureHash(hash);
        setCaptureSize({ width, height });
        setCameraState('CAPTURED');
        stopCamera();
    };

    const handleRetake = async () => {
        setCapturePreview(null);
        setCaptureHash(null);
        setCaptureSize(null);
        setLastError(null);
        await startCamera();
    };

    const handleSubmitCapture = async () => {
        if (!session || !captureHash || !purgeConfirmed || submitting) {
            return;
        }

        setSubmitting(true);
        setToast(null);
        setLastError(null);
        try {
            const completion = await completeLivenessVerificationSession({
                session_id: session.session_id,
                capture_hash: captureHash,
                capture_width: captureSize?.width,
                capture_height: captureSize?.height,
                immediate_purge_confirmed: true,
            });

            setToast({
                text: completion.verified
                    ? 'Liveness was verified. Taking you to the result screen now.'
                    : 'The liveness result is processing. Taking you to the result screen now.',
                type: 'success',
            });
            router.push(session.callback_url);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'LIVENESS_SESSION_COMPLETE_FAILED';
            setToast({ text: `We couldn’t finish liveness verification: ${message}`, type: 'error' });
            setLastError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
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
        clearLastError: () => setLastError(null),
        handleStartSession,
        handleCapture,
        handleRetake,
        handleSubmitCapture,
    };
}
