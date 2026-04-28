import Link from 'next/link';
import { BlurReveal, SoftFade } from '@/components/motion';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getLandingCopy } from '@/i18n/landing';
import { LocaleSwitch } from '@/components/surfaces/locale-switch';

export type LandingSurfaceProps = {
    isSignedIn: boolean;
    locale?: AppLocale;
};

export function LandingSurface({
    isSignedIn,
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
        <main className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen px-4 py-3 sm:px-8 sm:py-6`} lang={locale}>
            <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-6xl sm:min-h-[calc(100svh-3rem)]">
                <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-[rgba(241,233,219,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(241,233,219,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28%)]"
                    />

                    <div className="relative flex h-full flex-1 flex-col gap-8 lg:gap-10">
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

                        <section className="flex flex-1 flex-col justify-start gap-8 pt-5 sm:pt-7 lg:gap-10 lg:pt-8">
                            <div className="max-w-4xl space-y-6">
                                <BlurReveal className="space-y-4">
                                    <p className="sb-type-serif-display sb-accent-seal-orange text-[1.35rem] leading-none tracking-[0.04em] sm:text-[1.7rem]">
                                        {copy.wordmark}
                                    </p>
                                    <h1
                                        aria-label={copy.title}
                                        className="sb-type-serif-display max-w-4xl text-[clamp(2.55rem,6.2vw,5.15rem)] leading-[1.04] text-[color:var(--sb-stage-ink-strong)] [line-break:strict] [text-wrap:balance] [word-break:keep-all]"
                                    >
                                        {copy.titlePhrases.map((phrase) => (
                                            <span key={phrase} className="block">
                                                {phrase}
                                            </span>
                                        ))}
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
                                            className="inline-flex w-fit min-w-56 items-center justify-center gap-2 rounded-full border border-[rgba(241,233,219,0.72)] bg-[color:var(--sb-stage-ink-strong)] px-6 py-3.5 text-sm font-semibold tracking-[-0.01em] text-[#1E2823] shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_42px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,233,219,0.5)]"
                                        >
                                            <span>{primaryAction.label}</span>
                                            <span aria-hidden="true">→</span>
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
                                <section className="rounded-[1.6rem] border border-[rgba(241,233,219,0.12)] bg-[rgba(255,255,255,0.045)] p-5 sm:p-6">
                                    <div className="max-w-2xl space-y-3">
                                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
                                            {copy.support.badge}
                                        </p>
                                        <h2 className="sb-type-serif-display text-[1.35rem] leading-tight text-[color:var(--sb-stage-ink-strong)] sm:text-[1.55rem]">
                                            {copy.support.title}
                                        </h2>
                                        <p className="text-sm leading-7 text-[color:var(--sb-stage-ink-muted)]">
                                            {copy.support.description}
                                        </p>
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
