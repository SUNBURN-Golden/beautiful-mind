'use client';

import { useState } from 'react';
import type { AppLocale } from '@/i18n/config';
import { getCollateralCopy } from '@/i18n/collateral';

type CollateralSurfaceProps = {
    locale: AppLocale;
};

export function CollateralSurface({ locale }: CollateralSurfaceProps) {
    const copy = getCollateralCopy(locale);
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(false);
        try {
            const res = await fetch('/api/collateral/deposit', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) }),
            });
            if (!res.ok) throw new Error(`collateral deposit ${res.status}`);
            setSubmitted(true);
        } catch {
            setError(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div
                className={`sb-space-stage-antiquarian sb-locale-${locale} flex min-h-screen items-center justify-center px-4 py-12`}
                lang={locale}
            >
                <div className="sb-space-warm rounded-2xl px-8 py-10 text-center">
                    <h1 className="sb-type-serif-display mb-3 text-[color:var(--sb-stage-ink-strong)]">
                        {copy.successTitle}
                    </h1>
                    <p className="text-sm text-slate-600">{copy.successBody}</p>
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

                <form onSubmit={handleSubmit} className="sb-space-warm rounded-2xl px-6 py-6">
                    <h2 className="sb-type-headline mb-4 text-slate-900">
                        {copy.depositTitle}
                    </h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="collateral-amount" className="text-sm font-medium text-slate-700">
                                {copy.amountLabel}
                            </label>
                            <input
                                id="collateral-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={copy.amountPlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        {error && (
                            <p className="text-xs font-medium text-red-700">{copy.depositError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={submitting || !amount || Number(amount) <= 0}
                            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? copy.submittingLabel : copy.submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
