import React, { type PropsWithChildren, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ActiveStatusChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const ACTIVE_STATUS_CHIP_TONE_CLASS: Record<ActiveStatusChipTone, string> = {
    neutral: 'border-[#dde2ea] bg-[#f7f8fb] text-slate-600',
    info: 'border-[#d6e8ff] bg-[#f3f8ff] text-[#0f3d91]',
    success: 'border-[#cde8d4] bg-[#edf9f1] text-[#14532d]',
    warning: 'border-[#f4d6b8] bg-[#fff7ed] text-[#9a3412]',
    danger: 'border-[#f3d1d1] bg-[#fff5f5] text-[#b42318]',
};

export function ActiveMetaRow({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {children}
        </div>
    );
}

export function ActiveStatusChip({
    children,
    tone = 'neutral',
    className,
}: PropsWithChildren<{ tone?: ActiveStatusChipTone; className?: string }>) {
    return (
        <span
            className={cn(
                'inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide',
                ACTIVE_STATUS_CHIP_TONE_CLASS[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export function ActiveSupportText({
    children,
    className,
}: PropsWithChildren<{ className?: string }>) {
    return (
        <p className={cn('text-[11px] leading-relaxed text-slate-500', className)}>
            {children}
        </p>
    );
}

export function ActiveSurfaceShell({
    children,
    maxWidth = 'max-w-5xl',
    className,
}: PropsWithChildren<{ maxWidth?: string; className?: string }>) {
    return (
        <main className={cn('liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-6 sm:pt-14', className)}>
            <div className={cn('mx-auto space-y-6', maxWidth)}>
                {children}
            </div>
        </main>
    );
}

export function ActiveSectionPanel({
    children,
    className,
}: PropsWithChildren<{ className?: string }>) {
    return (
        <section className={cn('liquid-pane liquid-rise rounded-3xl border border-[#e5e5e7] p-5 sm:p-6', className)}>
            {children}
        </section>
    );
}

export function ActiveSurfaceIntro({
    title,
    description,
    meta,
    note,
    className,
}: {
    title: ReactNode;
    description: ReactNode;
    meta?: ReactNode;
    note?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn('space-y-3', className)}>
            <div className="space-y-2">
                <h1 className="liquid-title text-[30px] font-semibold tracking-tight sm:text-[34px]">{title}</h1>
                <div className="liquid-copy text-[15px]">{description}</div>
            </div>
            {meta ? <ActiveMetaRow>{meta}</ActiveMetaRow> : null}
            {note ? <ActiveSupportText className="max-w-2xl">{note}</ActiveSupportText> : null}
        </header>
    );
}
