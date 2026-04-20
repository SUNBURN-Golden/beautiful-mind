import Link from 'next/link';
import { BlurReveal, SoftFade } from '@/components/motion';
import { ReceiptCard } from '@/components/domain/receipt-card';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getLandingCopy } from '@/i18n/landing';
import { LocaleSwitch } from '@/components/surfaces/locale-switch';

export type LandingSurfaceProps = {
    isSignedIn: boolean;
    commitShort: string;
    locale?: AppLocale;
};

export function LandingSurface({
    isSignedIn,
    commitShort,
    locale = LIVE_DEFAULT_LOCALE,
}: LandingSurfaceProps) {
    const copy = getLandingCopy(locale);
    const primaryAction = isSignedIn
        ? {
            href: withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE),
            label: copy.signedInCtas.primary,
        }
        : {
            href: withLangQuery('/signup', locale, LIVE_DEFAULT_LOCALE),
            label: copy.signedOutCtas.primary,
        };
    const secondaryAction = isSignedIn
        ? null
        : {
            href: withLangQuery('/login', locale, LIVE_DEFAULT_LOCALE),
            label: copy.signedOutCtas.secondary,
        };

    return (
        <main className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen px-4 py-4 sm:px-8 sm:py-8`} lang={locale}>
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl">
                <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-[rgba(241,233,219,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,233,219,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28%)]"
                    />

                    <div className="relative flex h-full flex-1 flex-col gap-12">
                        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <span className="inline-flex w-fit rounded-full border border-[rgba(241,233,219,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                                {copy.badge}
                            </span>
                            <LocaleSwitch
                                currentLocale={locale}
                                fallbackLocale={LIVE_DEFAULT_LOCALE}
                                label={copy.localeSwitch.label}
                                englishLabel={copy.localeSwitch.english}
                                koreanLabel={copy.localeSwitch.korean}
                            />
                        </header>

                        <section className="flex flex-1 flex-col justify-center gap-12">
                            <div className="max-w-4xl space-y-8">
                                <BlurReveal className="space-y-4">
                                    <p className="sb-type-serif-display sb-accent-seal-orange text-[1.35rem] leading-none tracking-[0.04em] sm:text-[1.7rem]">
                                        {copy.wordmark}
                                    </p>
                                    <h1 className="sb-type-serif-display max-w-4xl text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.96] text-balance text-[color:var(--sb-stage-ink-strong)]">
                                        {copy.title}
                                    </h1>
                                </BlurReveal>

                                <SoftFade delayMs={60} className="max-w-2xl">
                                    <p className="text-[1.03rem] leading-8 text-[color:var(--sb-stage-ink-muted)] sm:text-[1.12rem]">
                                        {copy.description}
                                    </p>
                                </SoftFade>

                                <SoftFade delayMs={120} className="space-y-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <Link
                                            href={primaryAction.href}
                                            className="inline-flex w-fit items-center rounded-full border border-[rgba(241,233,219,0.14)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-[color:var(--sb-stage-ink-strong)] transition-colors hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,233,219,0.28)]"
                                        >
                                            <span className="sb-rule-orange inline-flex pb-1">
                                                {primaryAction.label}
                                            </span>
                                        </Link>

                                        {secondaryAction ? (
                                            <Link
                                                href={secondaryAction.href}
                                                className="inline-flex w-fit text-sm font-medium text-[color:var(--sb-stage-ink-muted)] underline-offset-4 transition-colors hover:text-[color:var(--sb-stage-ink-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,233,219,0.28)]"
                                            >
                                                {secondaryAction.label}
                                            </Link>
                                        ) : null}
                                    </div>

                                    <p className="max-w-2xl text-sm leading-7 text-[color:var(--sb-stage-ink-soft)]">
                                        {copy.actionNote}
                                    </p>
                                </SoftFade>
                            </div>

                            <SoftFade delayMs={180}>
                                <section className="rounded-[1.75rem] border border-[rgba(241,233,219,0.12)] bg-[rgba(255,255,255,0.04)] p-4 sm:p-5 lg:p-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="max-w-xl space-y-2">
                                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                                                {copy.support.badge}
                                            </p>
                                            <p className="text-sm leading-7 text-[color:var(--sb-stage-ink-muted)]">
                                                {copy.support.description}
                                            </p>
                                        </div>
                                        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--sb-stage-ink-soft)]">
                                            {copy.meta.build}: soulbound-launch-ui-v3 · {copy.meta.commit}: {commitShort}
                                        </p>
                                    </div>

                                    <div className="mt-5">
                                        <ReceiptCard
                                            locale={locale}
                                            title={copy.receipt.title}
                                            receiptId={copy.receipt.receiptId}
                                            issuedAt={copy.receipt.issuedAt}
                                            hash={copy.receipt.hash}
                                            contractVersion={copy.receipt.contractVersion}
                                            signatory={copy.receipt.signatory}
                                            status={copy.receipt.status}
                                        />
                                    </div>
                                </section>
                            </SoftFade>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}
