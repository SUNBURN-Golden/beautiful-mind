'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { withLangQuery, type AppLocale } from '@/i18n/config';

type LocaleSwitchProps = {
    currentLocale: AppLocale;
    fallbackLocale: AppLocale;
    label: string;
    englishLabel: string;
    koreanLabel: string;
};

export function LocaleSwitch({
    currentLocale,
    fallbackLocale,
    label,
    englishLabel,
    koreanLabel,
}: LocaleSwitchProps) {
    const pathname = usePathname() || '/';
    const englishHref = withLangQuery(pathname, 'en', fallbackLocale);
    const koreanHref = withLangQuery(pathname, 'ko', fallbackLocale);

    return (
        <div className="flex items-center gap-2 text-[12px]">
            <span className="font-medium text-[var(--sb-text-muted)]">{label}</span>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] p-1">
                <Link
                    href={englishHref}
                    prefetch={false}
                    aria-current={currentLocale === 'en' ? 'page' : undefined}
                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        currentLocale === 'en'
                            ? 'bg-[var(--sb-surface-panel)] text-[var(--sb-text-strong)] shadow-[var(--sb-shadow-soft)]'
                            : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-strong)]'
                    }`}
                >
                    {englishLabel}
                </Link>
                <Link
                    href={koreanHref}
                    prefetch={false}
                    aria-current={currentLocale === 'ko' ? 'page' : undefined}
                    className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        currentLocale === 'ko'
                            ? 'bg-[var(--sb-surface-panel)] text-[var(--sb-text-strong)] shadow-[var(--sb-shadow-soft)]'
                            : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-strong)]'
                    }`}
                >
                    {koreanLabel}
                </Link>
            </div>
        </div>
    );
}
