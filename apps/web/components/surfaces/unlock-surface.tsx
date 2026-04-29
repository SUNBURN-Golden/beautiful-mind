'use client';

import { useState } from 'react';
import type { AppLocale } from '@/i18n/config';
import { getUnlockCopy } from '@/i18n/unlock';

type UnlockSurfaceProps = {
    locale: AppLocale;
};

export function UnlockSurface({ locale }: UnlockSurfaceProps) {
    const copy = getUnlockCopy(locale);
    const [sessionId, setSessionId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(false);
        try {
            const res = await fetch('/api/review/unlock', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
            });
            if (!res.ok) throw new Error(`review unlock ${res.status}`);
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
                        {copy.feeLabel}
                    </h2>
                    <p className="mb-4 text-sm text-slate-500">{copy.feeDescription}</p>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="unlock-session" className="text-sm font-medium text-slate-700">
                                {copy.sessionIdLabel}
                            </label>
                            <input
                                id="unlock-session"
                                type="text"
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                                placeholder={copy.sessionIdPlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        {error && (
                            <p className="text-xs font-medium text-red-700">{copy.unlockError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={submitting || !sessionId}
                            className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? copy.confirmingLabel : copy.confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
