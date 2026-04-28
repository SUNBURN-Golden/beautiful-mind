'use client';

import { useEffect, useState } from 'react';
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

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);

        fetch(`/api/me/wallet?lang=${locale}`, {
            credentials: 'same-origin',
            cache: 'no-store',
        })
            .then((res) => {
                if (!res.ok) throw new Error(`wallet api ${res.status}`);
                return res.json();
            })
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
        };
    }, [locale]);

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
                <h1 className="sb-type-serif-display mb-3 text-center text-[color:var(--sb-stage-ink-strong)]">
                    {copy.title}
                </h1>
                <div className="sb-space-warm rounded-2xl px-8 py-10 text-center">
                    <p className="sb-type-headline mb-2 text-slate-800">{copy.emptyTitle}</p>
                    <p className="text-sm text-slate-500">{copy.emptyBody}</p>
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
                <h1 className="sb-type-serif-display mb-8 text-[color:var(--sb-stage-ink-strong)]">
                    {copy.title}
                </h1>

                {/* Balance overview */}
                <div className="sb-space-warm mb-6 rounded-2xl px-6 py-6">
                    <h2 className="sb-type-headline mb-4 text-slate-900">
                        {copy.balanceTitle}
                    </h2>
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