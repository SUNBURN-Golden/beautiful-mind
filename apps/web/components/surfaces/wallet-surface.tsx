'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AppLocale } from '@/i18n/config';
import { getWalletCopy } from '@/i18n/wallet';

type WalletActivityItem = {
    safeReference?: string;
    label?: string;
    amount?: number;
    direction?: 'credit' | 'debit';
    occurredAt?: string;
    status?: string;
    reason?: string | null;
};

type WalletHoldItem = {
    safeReference?: string;
    amount?: number;
    statusLabel?: string;
    createdAt?: string;
    releaseOrResolutionHint?: string | null;
};

type WalletData = {
    wallet: {
        totalBalance: number;
        availableBalance: number;
        heldBalance: number;
        currency: string;
    };
    activity: WalletActivityItem[];
    holds: WalletHoldItem[];
};

type WalletSurfaceProps = {
    locale: AppLocale;
};

function formatDate(iso: string | undefined | null, locale: AppLocale): string {
    if (!iso) return '';
    try {
        const date = new Date(iso);
        return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch {
        return '';
    }
}

function formatAmount(value: number | undefined): string {
    if (value === undefined || value === null) return '0';
    return Math.abs(value).toLocaleString();
}

export function WalletSurface({ locale }: WalletSurfaceProps) {
    const copy = getWalletCopy(locale);
    const [data, setData] = useState<WalletData | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [claimingWelcome, setClaimingWelcome] = useState(false);
    const [claimError, setClaimError] = useState(false);

    const loadWallet = useCallback(async (signal?: AbortSignal) => {
        const res = await fetch(`/api/me/wallet?lang=${locale}`, {
            credentials: 'same-origin',
            cache: 'no-store',
            signal,
        });
        if (!res.ok) throw new Error(`wallet api ${res.status}`);
        return res.json() as Promise<WalletData>;
    }, [locale]);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        setClaimError(false);

        loadWallet(controller.signal)
            .then((json: WalletData) => {
                if (!cancelled) {
                    setData(json);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [loadWallet]);

    const handleClaimWelcomeSoul = async () => {
        if (claimingWelcome) return;
        setClaimingWelcome(true);
        setClaimError(false);
        try {
            const claimRes = await fetch('/api/airdrop/claim', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!claimRes.ok) throw new Error(`airdrop claim ${claimRes.status}`);
            const nextWallet = await loadWallet();
            setData(nextWallet);
        } catch {
            setClaimError(true);
        } finally {
            setClaimingWelcome(false);
        }
    };

    if (loading) {
        return (
            <div
                className={`sb-space-stage-antiquarian sb-locale-${locale} flex min-h-screen items-center justify-center px-4 py-12`}
                lang={locale}
            >
                <p className="sb-type-headline text-[color:var(--sb-stage-ink-muted)]">
                    {copy.loading}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className={`sb-space-stage-antiquarian sb-locale-${locale} flex min-h-screen items-center justify-center px-4 py-12`}
                lang={locale}
            >
                <div className="sb-space-warm rounded-2xl px-6 py-8 text-center">
                    <p className="text-sm text-slate-700">{copy.error}</p>
                </div>
            </div>
        );
    }

    const wallet = data?.wallet;
    const activity = data?.activity ?? [];
    const holds = data?.holds ?? [];
    const totalBalance = wallet?.totalBalance ?? 0;
    const availableBalance = wallet?.availableBalance ?? 0;
    const heldBalance = wallet?.heldBalance ?? 0;
    const isEmpty = totalBalance === 0 && activity.length === 0 && holds.length === 0;

    if (isEmpty) {
        return (
            <div
                className={`sb-space-stage-antiquarian sb-locale-${locale} flex min-h-screen flex-col items-center justify-center px-4 py-12`}
                lang={locale}
            >
                <div className="mb-7 max-w-2xl text-center">
                    <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                        {copy.eyebrow}
                    </p>
                    <h1 className="sb-type-serif-display text-[clamp(2.35rem,6vw,4.2rem)] leading-[1.04] text-[color:var(--sb-stage-ink-strong)]">
                        {copy.title}
                    </h1>
                    <p className="mt-4 text-[0.98rem] leading-7 text-[color:var(--sb-stage-ink-muted)]">
                        {copy.description}
                    </p>
                </div>
                <div className="sb-space-warm w-full max-w-xl rounded-[1.75rem] px-8 py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                    <p className="sb-type-serif-display mb-2 text-[1.9rem] leading-tight text-[#1E2823]">{copy.emptyTitle}</p>
                    <p className="mx-auto max-w-sm text-sm leading-7 text-slate-600">{copy.emptyBody}</p>
                    <button
                        type="button"
                        onClick={() => void handleClaimWelcomeSoul()}
                        disabled={claimingWelcome}
                        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {claimingWelcome ? copy.claimingWelcomeLabel : copy.claimWelcomeLabel}
                    </button>
                    {claimError && (
                        <p className="mt-3 text-xs font-medium text-red-700">
                            {copy.claimWelcomeError}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen px-4 py-12 sm:px-6 lg:px-8`}
            lang={locale}
        >
            <div className="mx-auto max-w-3xl">
                <header className="mb-8 max-w-2xl">
                    <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                        {copy.eyebrow}
                    </p>
                    <h1 className="sb-type-serif-display text-[clamp(2.35rem,6vw,4rem)] leading-[1.04] text-[color:var(--sb-stage-ink-strong)]">
                        {copy.title}
                    </h1>
                    <p className="mt-4 text-[0.98rem] leading-7 text-[color:var(--sb-stage-ink-muted)]">
                        {copy.description}
                    </p>
                </header>

                {/* Balance overview */}
                <div className="sb-space-warm mb-6 rounded-[1.75rem] px-6 py-6 shadow-[0_20px_54px_rgba(0,0,0,0.2)]">
                    <h2 className="sb-type-headline mb-4 text-slate-900">
                        {copy.balanceTitle}
                    </h2>
                    <p className="mb-5 text-sm leading-7 text-slate-600">
                        {copy.balanceDescription}
                    </p>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-slate-500">{copy.totalLabel}</span>
                            <span className="sb-type-headline text-slate-900">
                                {formatAmount(totalBalance)} {copy.currency}
                            </span>
                        </div>
                        <div className="h-px bg-slate-200/60" />
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-slate-500">{copy.availableLabel}</span>
                            <span className="text-lg font-semibold text-slate-800">
                                {formatAmount(availableBalance)} {copy.currency}
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-slate-500">{copy.heldLabel}</span>
                            <span className="text-lg font-semibold text-slate-500">
                                {formatAmount(heldBalance)} {copy.currency}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Recent activity */}
                <div className="sb-space-warm mb-6 rounded-2xl px-6 py-6">
                    <h2 className="sb-type-headline mb-4 text-slate-900">
                        {copy.activityTitle}
                    </h2>
                    {activity.length === 0 ? (
                        <p className="text-sm text-slate-400">{copy.activityEmpty}</p>
                    ) : (
                        <ul className="divide-y divide-slate-200/60">
                            {activity.slice(0, 20).map((item, i) => {
                                const isCredit = item.direction === 'credit';
                                return (
                                    <li
                                        key={item.safeReference ?? i}
                                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-slate-800">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {formatDate(item.occurredAt, locale)}
                                            </span>
                                        </div>
                                        <span
                                            className={`text-sm font-semibold tabular-nums ${
                                                isCredit
                                                    ? 'text-emerald-700'
                                                    : 'text-[color:var(--sb-text-warm-muted)]'
                                            }`}
                                        >
                                            {isCredit ? copy.creditPrefix : copy.debitPrefix}
                                            {formatAmount(item.amount ?? 0)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Active holds — only rendered if holds exist */}
                {holds.length > 0 && (
                    <div className="sb-space-warm rounded-2xl px-6 py-6">
                        <h2 className="sb-type-headline mb-4 text-slate-900">
                            {copy.holdsTitle}
                        </h2>
                        <ul className="divide-y divide-slate-200/60">
                            {holds.map((hold, i) => (
                                <li
                                    key={hold.safeReference ?? i}
                                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium text-slate-800">
                                            {hold.statusLabel}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {formatDate(hold.createdAt, locale)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-600 tabular-nums">
                                        {formatAmount(hold.amount ?? 0)} {copy.currency}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
