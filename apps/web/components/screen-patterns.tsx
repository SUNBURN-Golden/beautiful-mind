import React, { type PropsWithChildren, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper, SupportCTA } from '@/components/ui-kit';
import { cn } from '@/lib/utils';

type FlowPageShellProps = PropsWithChildren<{
    maxWidth?: string;
    className?: string;
    support?: ReactNode;
    showSupport?: boolean;
}>;

export function FlowPageShell({
    children,
    maxWidth = 'max-w-3xl',
    className,
    support,
    showSupport = true,
}: FlowPageShellProps) {
    return (
        <main className={cn('mx-auto flex min-h-screen w-full flex-col px-4 pb-14 pt-12 sm:px-6 sm:pt-16', maxWidth, className)}>
            {children}
            {showSupport ? <SupportCTA>{support}</SupportCTA> : null}
        </main>
    );
}

export function FlowPagePanel({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={cn('liquid-pane liquid-rise rounded-3xl p-6 sm:p-8', className)}>
            {children}
        </div>
    );
}

type FlowPageHeaderProps = {
    step?: number;
    totalSteps?: number;
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    className?: string;
};

export function FlowPageHeader({
    step,
    totalSteps,
    eyebrow,
    title,
    description,
    className,
}: FlowPageHeaderProps) {
    return (
        <header className={cn('space-y-4', className)}>
            {typeof step === 'number' && typeof totalSteps === 'number' ? (
                <Stepper currentStep={step} totalSteps={totalSteps} />
            ) : null}
            {eyebrow ? (
                <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {eyebrow}
                </div>
            ) : null}
            <div className="space-y-2">
                <h1 className="liquid-title text-[30px] font-semibold tracking-tight">{title}</h1>
                {description ? <div className="liquid-copy text-[15px] leading-relaxed">{description}</div> : null}
            </div>
        </header>
    );
}

export function FlowInfoGrid({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
            {children}
        </div>
    );
}

type FlowInfoCardProps = {
    title: ReactNode;
    description: ReactNode;
    className?: string;
};

export function FlowInfoCard({ title, description, className }: FlowInfoCardProps) {
    return (
        <div className={cn('rounded-2xl border border-[#e5e5e7] bg-white p-4 text-[13px] text-slate-700', className)}>
            <p className="font-semibold text-slate-900">{title}</p>
            <div className="mt-1">{description}</div>
        </div>
    );
}

type FlowInsetProps = PropsWithChildren<{
    title?: ReactNode;
    className?: string;
}>;

export function FlowInset({ title, children, className }: FlowInsetProps) {
    return (
        <div className={cn('rounded-2xl border border-[#e5e5e7] bg-[#fbfbfd] p-4 text-[13px] leading-relaxed text-slate-700', className)}>
            {title ? <p className="font-semibold text-slate-900">{title}</p> : null}
            <div className={title ? 'mt-1' : undefined}>{children}</div>
        </div>
    );
}

export function PageActionRow({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={cn('flex flex-wrap gap-3', className)}>
            {children}
        </div>
    );
}

type ActionPageShellProps = PropsWithChildren<{
    maxWidth?: string;
    className?: string;
}>;

export function ActionPageShell({
    children,
    maxWidth = 'max-w-3xl',
    className,
}: ActionPageShellProps) {
    return (
        <div className={cn('liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6', className)}>
            <div className={cn('w-full', maxWidth)}>
                {children}
            </div>
        </div>
    );
}

type ActionPageCardProps = PropsWithChildren<{
    title: ReactNode;
    description?: ReactNode;
    meta?: ReactNode;
    metaClassName?: string;
    footer?: ReactNode;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
}>;

export function ActionPageCard({
    title,
    description,
    meta,
    metaClassName,
    footer,
    children,
    className,
    headerClassName,
    contentClassName,
    footerClassName,
    titleClassName,
    descriptionClassName,
}: ActionPageCardProps) {
    return (
        <Card className={cn('liquid-pane liquid-rise rounded-3xl border-[#e5e5e7]', className)}>
            <CardHeader className={headerClassName}>
                <CardTitle className={cn('text-[28px] font-semibold tracking-tight', titleClassName)}>{title}</CardTitle>
                {description ? (
                    <CardDescription className={cn('text-[14px] leading-relaxed', descriptionClassName)}>
                        {description}
                    </CardDescription>
                ) : null}
                {meta ? <p className={cn('text-[11px] text-slate-500', metaClassName)}>{meta}</p> : null}
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
            {footer ? <CardFooter className={footerClassName}>{footer}</CardFooter> : null}
        </Card>
    );
}

type ReferenceDetailRow = {
    label: ReactNode;
    value: ReactNode;
};

type ReferenceDetailsCardProps = {
    rows: ReferenceDetailRow[];
    title?: ReactNode;
    className?: string;
};

export function ReferenceDetailsCard({
    rows,
    title = 'Reference',
    className,
}: ReferenceDetailsCardProps) {
    return (
        <div className={cn('rounded-xl border border-[#e5e5e7] bg-[#fbfbfd] p-4', className)}>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{title}</p>
            <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-[11px] text-slate-600">
                {rows.map((row, index) => (
                    <React.Fragment key={`reference-row-${index}`}>
                        <dt className="text-slate-500">{row.label}</dt>
                        <dd className="break-all font-medium text-slate-700">{row.value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        </div>
    );
}

export function AdminPageShell({ children, className }: PropsWithChildren<{ className?: string }>) {
    return <main className={cn('space-y-5', className)}>{children}</main>;
}

type AdminPageHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
};

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
    return (
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">{title}</h1>
                {description ? <div className="mt-1 text-sm text-[#6e6e73]">{description}</div> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
    );
}

export function AdminSummaryGrid({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <section className={cn('grid gap-4 md:grid-cols-2', className)}>
            {children}
        </section>
    );
}

type AdminMetricCardProps = {
    label: ReactNode;
    value: ReactNode;
    icon?: ReactNode;
    accentClassName?: string;
    className?: string;
};

export function AdminMetricCard({
    label,
    value,
    icon,
    accentClassName,
    className,
}: AdminMetricCardProps) {
    return (
        <section className={cn('liquid-pane liquid-rise rounded-2xl border border-[#e5e5e7] p-5', className)}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6e6e73]">{label}</p>
                {icon ? <div className={cn('shrink-0 text-[#6e6e73]', accentClassName)}>{icon}</div> : null}
            </div>
            <div className="mt-4 text-[30px] font-semibold leading-none tracking-tight text-[#1d1d1f]">{value}</div>
        </section>
    );
}

type AdminSectionCardProps = PropsWithChildren<{
    title: ReactNode;
    description?: ReactNode;
    className?: string;
}>;

export function AdminSectionCard({ title, description, children, className }: AdminSectionCardProps) {
    return (
        <section className={cn('rounded-2xl border border-[#e5e5e7] bg-white p-5', className)}>
            <h2 className="text-lg font-semibold text-[#1d1d1f]">{title}</h2>
            {description ? <div className="mt-1 text-sm text-[#6e6e73]">{description}</div> : null}
            <div className="mt-3">{children}</div>
        </section>
    );
}
