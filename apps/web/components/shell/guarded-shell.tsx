'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LocaleSwitch } from '@/components/surfaces/locale-switch';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getGuardedShellCopy } from '@/i18n/guarded-shell';
import { useAppLocale } from '@/i18n/use-app-locale';
import { formatActionLabel } from '@/lib/contracts/status-copy';
import { createClient } from '@/utils/supabase/client';

type GuardedShellProps = {
    children: ReactNode;
};

type EnabledNavItem = {
    key: string;
    label: string;
    href: string;
    enabled: true;
};

type DisabledNavItem = {
    key: string;
    label: string;
    reason: string;
    enabled: false;
};

type GuardedNavItem = EnabledNavItem | DisabledNavItem;

function buildNavigation(locale: AppLocale): GuardedNavItem[] {
    const copy = getGuardedShellCopy(locale);
    return [
        {
            key: 'dashboard',
            label: copy.nav.dashboard.label,
            href: withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE),
            enabled: true,
        },
        {
            key: 'status',
            label: copy.nav.status.label,
            href: withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE),
            enabled: true,
        },
        {
            key: 'proposals',
            label: copy.nav.proposals.label,
            reason: copy.nav.proposals.reason || copy.disabledReason,
            enabled: false,
        },
        {
            key: 'correspondence',
            label: copy.nav.correspondence.label,
            reason: copy.nav.correspondence.reason || copy.disabledReason,
            enabled: false,
        },
        {
            key: 'trust-records',
            label: copy.nav.trustRecords.label,
            reason: copy.nav.trustRecords.reason || copy.disabledReason,
            enabled: false,
        },
        {
            key: 'reporting',
            label: copy.nav.reporting.label,
            reason: copy.nav.reporting.reason || copy.disabledReason,
            enabled: false,
        },
        {
            key: 'participation',
            label: copy.nav.participation.label,
            reason: copy.nav.participation.reason || copy.disabledReason,
            enabled: false,
        },
    ];
}

export function GuardedShell({ children }: GuardedShellProps) {
    const locale = useAppLocale(LIVE_DEFAULT_LOCALE);
    const copy = getGuardedShellCopy(locale);
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const navItems = buildNavigation(locale);

    const handleSignOut = async () => {
        if (isSigningOut) return;
        setIsSigningOut(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } finally {
            router.replace(withLangQuery('/login', locale, LIVE_DEFAULT_LOCALE));
            router.refresh();
            setIsSigningOut(false);
        }
    };

    return (
        <div className={`sb-guarded-shell sb-locale-${locale} min-h-screen`} lang={locale}>
            <header className="sb-guarded-header relative z-20 border-b border-slate-200/70 bg-slate-950 px-4 py-4 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)] sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-1">
                        <Link
                            href={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}
                            className="text-[20px] font-semibold tracking-[-0.03em] text-white"
                        >
                            {copy.brand}
                        </Link>
                        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-white/[0.54]">
                            {copy.eyebrow}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <nav className="sb-guarded-nav" aria-label={copy.navLabel}>
                            <ul className="flex flex-wrap gap-2">
                                {navItems.map((item) => (
                                    <li key={item.key}>
                                        {item.enabled ? (
                                            <Link
                                                href={item.href}
                                                className="inline-flex min-h-10 items-center rounded-full border border-white/[0.14] bg-white/[0.08] px-3.5 py-2 text-[13px] font-semibold text-white/[0.86] transition hover:bg-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                            >
                                                {item.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[13px] font-semibold text-white/[0.42]"
                                                aria-disabled="true"
                                                title={item.reason}
                                            >
                                                <span>{item.label}</span>
                                                <span className="text-[11px] font-medium text-white/[0.34]">
                                                    {item.reason}
                                                </span>
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-start">
                            <LocaleSwitch
                                currentLocale={locale}
                                fallbackLocale={LIVE_DEFAULT_LOCALE}
                                label={copy.languageLabel}
                                englishLabel={copy.englishLabel}
                                koreanLabel={copy.koreanLabel}
                            />
                            <button
                                type="button"
                                onClick={() => void handleSignOut()}
                                disabled={isSigningOut}
                                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.94] px-3.5 py-2 text-[13px] font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSigningOut ? copy.signOutBusy : formatActionLabel('SIGN_OUT', locale)}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <div className="relative z-10">{children}</div>
        </div>
    );
}
