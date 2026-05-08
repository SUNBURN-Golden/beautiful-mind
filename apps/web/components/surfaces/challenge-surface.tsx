'use client';

import { useState } from 'react';
import type { AppLocale } from '@/i18n/config';
import { getChallengeCopy } from '@/i18n/challenge';

type ChallengeSurfaceProps = {
    locale: AppLocale;
};

export function ChallengeSurface({ locale }: ChallengeSurfaceProps) {
    const copy = getChallengeCopy(locale);
    const [targetUserId, setTargetUserId] = useState('');
    const [claimId, setClaimId] = useState('');
    const [evidenceRef, setEvidenceRef] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError(false);
        try {
            const res = await fetch('/api/challenge/open', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_user_id: targetUserId,
                    claim_id: claimId,
                    evidence_ref: evidenceRef,
                    note: note || undefined,
                }),
            });
            if (!res.ok) throw new Error(`challenge open ${res.status}`);
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
                <div className="sb-space-warm rounded-[1.75rem] px-8 py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                    <h1 className="sb-type-serif-display mb-3 text-[#1E2823]">
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
                <header className="mb-8 max-w-2xl">
                    <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                        {copy.eyebrow}
                    </p>
                    <h1 className="sb-type-serif-display text-[clamp(2.35rem,6vw,4.1rem)] leading-[1.04] text-[color:var(--sb-stage-ink-strong)]">
                        {copy.title}
                    </h1>
                    <p className="mt-4 text-[0.98rem] leading-7 text-[color:var(--sb-stage-ink-muted)]">
                        {copy.description}
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="sb-space-warm rounded-[1.75rem] px-6 py-6 shadow-[0_20px_54px_rgba(0,0,0,0.2)]">
                    <div className="flex flex-col gap-4">
                        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-950">{copy.warningTitle}</p>
                            <p className="mt-1 text-xs leading-5 text-amber-900">{copy.warningBody}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="challenge-target" className="text-sm font-medium text-slate-700">
                                {copy.targetLabel}
                            </label>
                            <p className="text-xs leading-5 text-slate-500">
                                {copy.targetHelper}
                            </p>
                            <input
                                id="challenge-target"
                                type="text"
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                placeholder={copy.targetPlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="challenge-claim" className="text-sm font-medium text-slate-700">
                                {copy.claimLabel}
                            </label>
                            <p className="text-xs leading-5 text-slate-500">
                                {copy.claimHelper}
                            </p>
                            <input
                                id="challenge-claim"
                                type="text"
                                value={claimId}
                                onChange={(e) => setClaimId(e.target.value)}
                                placeholder={copy.claimPlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="challenge-evidence" className="text-sm font-medium text-slate-700">
                                {copy.evidenceLabel}
                            </label>
                            <p className="text-xs leading-5 text-slate-500">
                                {copy.evidenceHelper}
                            </p>
                            <input
                                id="challenge-evidence"
                                type="text"
                                value={evidenceRef}
                                onChange={(e) => setEvidenceRef(e.target.value)}
                                placeholder={copy.evidencePlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="challenge-note" className="text-sm font-medium text-slate-700">
                                {copy.noteLabel}
                            </label>
                            <p className="text-xs leading-5 text-slate-500">
                                {copy.noteHelper}
                            </p>
                            <input
                                id="challenge-note"
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={copy.notePlaceholder}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                            />
                        </div>
                        {error && (
                            <p className="text-xs font-medium text-red-700">{copy.challengeError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={submitting || !targetUserId || !claimId || !evidenceRef}
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
