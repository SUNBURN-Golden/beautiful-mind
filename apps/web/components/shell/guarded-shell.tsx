'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LocaleSwitch } from '@/components/surfaces/locale-switch';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getGuardedShellCopy } from '@/i18n/guarded-shell';
import { useAppLocale } from '@/i18n/use-app-locale';
import { formatActionLabel } from '@/lib/contracts/status-copy';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { useStatus } from '@/lib/useStatus';
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

function buildNavigation(locale: AppLocale, options: { showReviewStatus: boolean }): GuardedNavItem[] {
    const copy = getGuardedShellCopy(locale);
    const navItems: GuardedNavItem[] = [
        {
            key: 'dashboard',
            label: copy.nav.dashboard.label,
            href: withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE),
            enabled: true,
        },
        {
            key: 'wallet',
            label: copy.nav.wallet.label,
            href: withLangQuery('/wallet', locale, LIVE_DEFAULT_LOCALE),
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

    if (options.showReviewStatus) {
        navItems.splice(2, 0, {
            key: 'status',
            label: copy.nav.status.label,
            href: withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE),
            enabled: true,
        });
    }

    return navItems;
}

export function GuardedShell({ children }: GuardedShellProps) {
    const locale = useAppLocale(LIVE_DEFAULT_LOCALE);
    const copy = getGuardedShellCopy(locale);
    const router = useRouter();
    const { currentStage, isLoading: isStatusLoading } = useStatus({ redirectOnUnauthorized: false });
    const [isSigningOut, setIsSigningOut] = useState(false);
    const navItems = buildNavigation(locale, {
        showReviewStatus: !isStatusLoading && currentStage !== ADMISSION_STAGES.ACTIVE,
    });

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
        <div className={`sb-space-stage-antiquarian sb-guarded-shell sb-locale-${locale} min-h-screen`} lang={locale}>
            <header className="sb-guarded-header relative z-20 border-b border-[rgba(241,233,219,0.12)] bg-[color:var(--sb-stage-depth)] px-4 py-4 text-[color:var(--sb-stage-ink-strong)] shadow-[0_18px_42px_rgba(0,0,0,0.24)] sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-1">
                        <Link
                            href={withLangQuery('/dashboard', locale, LIVE_DEFAULT_LOCALE)}
                            className="sb-type-serif-display text-[22px] font-semibold tracking-[-0.04em] text-[color:var(--sb-stage-ink-strong)]"
                        >
                            {copy.brand}
                        </Link>
                        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[color:var(--sb-stage-ink-soft)]">
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
                                                className="inline-flex min-h-10 items-center rounded-full border border-[rgba(241,233,219,0.16)] bg-white/[0.07] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--sb-stage-ink-muted)] transition hover:bg-white/[0.12] hover:text-[color:var(--sb-stage-ink-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,233,219,0.58)]"
                                            >
                                                {item.label}
                                            </Link>
                                        ) : (
                                            <span
                                                className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-full border border-[rgba(241,233,219,0.08)] bg-white/[0.025] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--sb-stage-ink-soft)]"
                                                aria-disabled="true"
                                                title={item.reason}
                                            >
                                                <span>{item.label}</span>
                                                <span className="text-[11px] font-medium text-[rgba(241,233,219,0.36)]">
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
                                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(241,233,219,0.38)] bg-[color:var(--sb-stage-ink-strong)] px-3.5 py-2 text-[13px] font-semibold text-[#1E2823] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
