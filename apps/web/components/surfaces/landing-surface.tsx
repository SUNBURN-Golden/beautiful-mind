import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

    return (
        <main className={`liquid-shell sb-stage-shell sb-landing-stage sb-locale-${locale} px-4 pb-16 pt-12 sm:px-8 sm:pt-16`} lang={locale}>
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between gap-12">
                <header className="sb-stage-hero-panel sb-landing-hero liquid-rise space-y-8">
                    <div className="sb-surface-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="liquid-chip sb-surface-kicker inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                            {copy.badge}
                        </div>
                        <LocaleSwitch
                            currentLocale={locale}
                            fallbackLocale={LIVE_DEFAULT_LOCALE}
                            label={copy.localeSwitch.label}
                            englishLabel={copy.localeSwitch.english}
                            koreanLabel={copy.localeSwitch.korean}
                        />
                    </div>
                    <h1 className="liquid-title sb-landing-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight text-balance sm:text-[62px]">
                        {copy.title}
                    </h1>
                    <p className="liquid-copy sb-landing-description max-w-2xl text-[16px] leading-relaxed text-balance sm:text-[18px]">
                        {copy.description}
                    </p>
                    <div className="sb-action-cluster sb-landing-actions flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        {isSignedIn ? (
                            <>
                                <Button asChild className="sb-pill-action sb-pill-action-inline sb-pill-action-ivory sb-landing-button sb-landing-button-primary h-12 px-6">
                                    <Link href={withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.status}</Link>
                                </Button>
                                <Button asChild variant="outline" className="sb-pill-action sb-pill-action-inline sb-pill-action-glass sb-landing-button sb-landing-button-secondary h-12 px-6">
                                    <Link href={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.dashboard}</Link>
                                </Button>
                                <Button asChild variant="secondary" className="sb-pill-action sb-pill-action-inline sb-pill-action-ghost sb-landing-button sb-landing-button-tertiary h-12 px-6">
                                    <Link href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.manual}</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild className="sb-pill-action sb-pill-action-inline sb-pill-action-ivory sb-landing-button sb-landing-button-primary h-12 px-6">
                                    <Link href={withLangQuery('/signup', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.start}</Link>
                                </Button>
                                <Button asChild variant="outline" className="sb-pill-action sb-pill-action-inline sb-pill-action-glass sb-landing-button sb-landing-button-secondary h-12 px-6">
                                    <Link href={withLangQuery('/login', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.login}</Link>
                                </Button>
                                <Button asChild variant="secondary" className="sb-pill-action sb-pill-action-inline sb-pill-action-ghost sb-landing-button sb-landing-button-tertiary h-12 px-6">
                                    <Link href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.manual}</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                <section className="sb-landing-card-grid grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
                    {copy.cards.map((card) => (
                        <article key={card.title} className="sb-surface-subpanel sb-landing-card liquid-rise">
                            <h2 className="sb-landing-card-title">{card.title}</h2>
                            <p className="sb-landing-card-copy">{card.description}</p>
                        </article>
                    ))}
                </section>

                <footer className="sb-surface-footnote sb-landing-footer pb-2 text-xs">
                    {copy.footerLead} · {copy.footerBuild}: soulbound-launch-ui-v3 · {copy.footerCommit}: {commitShort}
                </footer>
            </div>
        </main>
    );
}
