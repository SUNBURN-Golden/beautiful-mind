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
        <main className="liquid-shell px-4 pb-16 pt-12 sm:px-8 sm:pt-16">
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between gap-12">
                <header className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
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
                    <h1 className="liquid-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight text-balance sm:text-[56px]">
                        {copy.title}
                    </h1>
                    <p className="liquid-copy max-w-2xl text-[16px] leading-relaxed text-balance sm:text-[18px]">
                        {copy.description}
                    </p>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        {isSignedIn ? (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href={withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.status}</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.dashboard}</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedInCtas.manual}</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href={withLangQuery('/signup', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.start}</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href={withLangQuery('/login', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.login}</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)}>{copy.signedOutCtas.manual}</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
                    {copy.cards.map((card) => (
                        <article key={card.title} className="liquid-pane rounded-2xl p-5">
                            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">{card.title}</h2>
                            <p className="text-sm leading-relaxed text-[#1d1d1f]">{card.description}</p>
                        </article>
                    ))}
                </section>

                <footer className="pb-2 text-xs text-[#6e6e73]">
                    {copy.footerLead} · {copy.footerBuild}: soulbound-launch-ui-v3 · {copy.footerCommit}: {commitShort}
                </footer>
            </div>
        </main>
    );
}
