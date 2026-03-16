"use client";

import React, { PropsWithChildren } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getExpectedRoute, STAGE_ROUTES, Stage } from "@/lib/stageRoutes";

function isStage(value: string): value is Stage {
    return Object.prototype.hasOwnProperty.call(STAGE_ROUTES, value);
}

export function Stepper({ currentStep = 0, totalSteps = 0 }: { currentStep?: number; totalSteps?: number }) {
    const safeTotalSteps = Math.max(totalSteps, 1);
    const normalizedCurrentStep = Math.min(Math.max(currentStep, 0), safeTotalSteps);

    return (
        <div className="mb-6 inline-flex items-center gap-3 rounded-full px-3 py-1.5 liquid-stepper text-[11px] font-semibold tracking-[0.14em] text-slate-600">
            <span className="uppercase">Step</span>
            <span className="font-mono tracking-[0.08em] text-slate-700">
                {normalizedCurrentStep}/{safeTotalSteps}
            </span>
            <div className="flex items-center gap-1.5">
                {Array.from({ length: safeTotalSteps }).map((_, idx) => {
                    const isActive = idx < normalizedCurrentStep;
                    return (
                        <span
                            key={`step-dot-${idx}`}
                            className={cn(
                                "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                                isActive ? "bg-sky-500" : "bg-slate-300/80"
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { submitting?: boolean }) {
    const { submitting, children, className, ...buttonProps } = props;
    return (
        <button
            {...buttonProps}
            className={cn("liquid-btn liquid-btn-primary", className)}
            aria-busy={submitting || undefined}
        >
            {submitting ? "Processing..." : children}
        </button>
    );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className, children, ...buttonProps } = props;
    return (
        <button
            {...buttonProps}
            className={cn("liquid-btn liquid-btn-secondary", className)}
        >
            {children}
        </button>
    );
}

export function SupportCTA({ children }: PropsWithChildren) {
    return (
        <div className="mt-auto pt-8 text-center text-[13px] text-slate-500">
            {children ?? (
                <>
                    Need a hand? Start with the{" "}
                    <Link href="/manual" className="font-semibold text-[#06c] underline underline-offset-2 hover:text-[#0077ed]">
                        guide
                    </Link>
                    {" "}for the quickest path forward.
                </>
            )}
        </div>
    );
}

export function Toast({ message, type = 'info' }: { message?: string, type?: 'info' | 'error' | 'success' }) {
    if (!message) return null;

    const typeClass = {
        info: "liquid-toast-info",
        error: "liquid-toast-error",
        success: "liquid-toast-success",
    };

    return (
        <div className={cn("mb-4 liquid-toast liquid-rise", typeClass[type])} role="status" aria-live="polite">
            {message}
        </div>
    );
}

export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn("grid gap-3", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={`skeleton-line-${i}`}
                    className="liquid-skeleton-line"
                    style={{ width: i === lines - 1 ? "62%" : "100%" }}
                />
            ))}
        </div>
    );
}

export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
    const generatedId = React.useId();
    const inputId = props.id || generatedId;
    const { className, id: _unusedId, ...inputProps } = props;
    return (
        <div className="mb-4 flex w-full flex-col gap-2">
            {label && <label htmlFor={inputId} className="text-[13px] font-medium text-slate-600">{label}</label>}
            <input
                id={inputId}
                {...inputProps}
                className={cn("liquid-input", className)}
            />
        </div>
    );
}

export function ConsentItem({ label, checked, onChange, link }: { label: string; checked?: boolean; onChange?: () => void; link?: string }) {
    return (
        <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={!!checked} onChange={onChange} className="liquid-checkbox" />
                <span className="text-[15px] text-slate-700">{label}</span>
            </label>
            {link && (
                <Link
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-[30px] mt-1 inline-block text-[12px] text-sky-600 underline"
                >
                    View terms
                </Link>
            )}
        </div>
    );
}

export function DocumentViewer({ text }: { text?: string }) {
    return (
        <div className="mb-6 liquid-doc">
            {text ?? "Document content is not available."}
        </div>
    );
}

export function SignaturePad({ onSign }: { onSign?: (data: string) => void }) {
    const signatureData = "data:image/png;base64,STABLE_PLACEHOLDER";
    const triggerSign = () => onSign?.(signatureData);

    return (
        <div className="mb-6 liquid-sign-pad liquid-rise">
            <div
                className="mb-4 flex h-[124px] cursor-crosshair items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[13px] text-slate-500 transition-colors hover:border-[#06c]"
                onClick={triggerSign}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        triggerSign();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                Sign here (click to simulate)
            </div>
            <button type="button" onClick={triggerSign} className="liquid-btn liquid-btn-secondary">
                Test signature capture
            </button>
        </div>
    );
}

export function AuditLogRow({ action, timestamp, hash }: { action: string; timestamp?: string; hash?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b liquid-divider py-2 text-[12px]">
            <span className="font-medium text-slate-700">{action}</span>
            <div className="flex items-center gap-2">
                {hash && <span className="font-mono text-[11px] text-slate-500/80">{hash.slice(0, 8)}</span>}
                <span className="text-slate-500/80">{timestamp?.split('T')[0]}</span>
            </div>
        </div>
    );
}

export function StageTransitionNotice({
    currentStep,
    title = "We’re syncing your progress.",
    description = "We’ll take you to the screen that matches your current step.",
    primaryLabel = "Go to current step",
    secondaryLabel = "Open the guide",
}: {
    currentStep?: string;
    title?: string;
    description?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
}) {
    const destination = currentStep && isStage(currentStep)
        ? getExpectedRoute(currentStep)
        : "/apply";

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-20 sm:px-6 sm:pt-24">
            <div className="liquid-pane liquid-rise rounded-3xl p-6">
                <h1 className="liquid-title text-[22px] font-semibold">{title}</h1>
                <p className="liquid-copy mt-2 text-[14px]">{description}</p>
                <div className="mt-5 grid gap-3">
                    <Link
                        href={destination}
                        className="liquid-btn liquid-btn-primary"
                    >
                        {primaryLabel}
                    </Link>
                    <Link
                        href="/manual"
                        className="liquid-btn liquid-btn-secondary"
                    >
                        {secondaryLabel}
                    </Link>
                </div>
            </div>
        </main>
    );
}

type FeedbackTone = 'info' | 'success' | 'warning' | 'error';

const FEEDBACK_TONE_CLASS: Record<FeedbackTone, string> = {
    info: 'border-[#d6e8ff] bg-[#f3f8ff] text-[#0f3d91]',
    success: 'border-[#cde8d4] bg-[#edf9f1] text-[#14532d]',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-[#f3d1d1] bg-[#fff5f5] text-[#7f1d1d]',
};

export function PageLoadingState({
    title = 'Loading your progress.',
    description = 'This should only take a moment.',
    lines = 4,
}: {
    title?: string;
    description?: string;
    lines?: number;
}) {
    return (
        <main className="mx-auto max-w-4xl px-4 pt-20 sm:px-6">
            <div className="liquid-pane rounded-3xl p-6">
                <h1 className="text-[18px] font-semibold text-slate-900">{title}</h1>
                <p className="mt-1 text-[13px] text-slate-600">{description}</p>
                <Skeleton lines={lines} className="mt-5" />
            </div>
        </main>
    );
}

export function FeedbackPanel({
    tone = 'info',
    title,
    description,
    children,
}: PropsWithChildren<{
    tone?: FeedbackTone;
    title: string;
    description?: string;
}>) {
    return (
        <section className={cn('rounded-2xl border p-4 text-[13px] leading-relaxed', FEEDBACK_TONE_CLASS[tone])}>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-1">{description}</p>}
            {children ? <div className="mt-3">{children}</div> : null}
        </section>
    );
}

export function RecoverableErrorPanel({
    title = 'Something interrupted this step.',
    message,
    retryLabel = 'Try again',
    onRetry,
    secondaryHref,
    secondaryLabel,
}: {
    title?: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    secondaryHref?: string;
    secondaryLabel?: string;
}) {
    return (
        <FeedbackPanel tone="error" title={title} description={message}>
            <div className="flex flex-wrap gap-2">
                {onRetry && (
                    <button type="button" onClick={onRetry} className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]">
                        {retryLabel}
                    </button>
                )}
                {secondaryHref && secondaryLabel && (
                    <Link href={secondaryHref} className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]">
                        {secondaryLabel}
                    </Link>
                )}
            </div>
        </FeedbackPanel>
    );
}

export function SuccessNextStepPanel({
    title,
    description,
    primaryHref,
    primaryLabel,
    secondaryHref,
    secondaryLabel,
}: {
    title: string;
    description?: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
}) {
    return (
        <FeedbackPanel tone="success" title={title} description={description}>
            <div className="flex flex-wrap gap-2">
                <Link href={primaryHref} className="liquid-btn liquid-btn-primary !px-3 !py-1.5 text-[12px]">
                    {primaryLabel}
                </Link>
                {secondaryHref && secondaryLabel && (
                    <Link href={secondaryHref} className="liquid-btn liquid-btn-secondary !px-3 !py-1.5 text-[12px]">
                        {secondaryLabel}
                    </Link>
                )}
            </div>
        </FeedbackPanel>
    );
}
