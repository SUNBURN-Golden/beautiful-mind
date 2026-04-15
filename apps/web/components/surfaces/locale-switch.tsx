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
        <div className="sb-locale-switch" role="group" aria-label={label}>
            <span className="sb-locale-label">{label}</span>
            <div className="sb-locale-track">
                <Link
                    href={englishHref}
                    prefetch={false}
                    aria-current={currentLocale === 'en' ? 'page' : undefined}
                    className={`sb-locale-option ${
                        currentLocale === 'en'
                            ? 'sb-locale-option-active'
                            : 'sb-locale-option-idle'
                    }`}
                >
                    {englishLabel}
                </Link>
                <Link
                    href={koreanHref}
                    prefetch={false}
                    aria-current={currentLocale === 'ko' ? 'page' : undefined}
                    className={`sb-locale-option ${
                        currentLocale === 'ko'
                            ? 'sb-locale-option-active'
                            : 'sb-locale-option-idle'
                    }`}
                >
                    {koreanLabel}
                </Link>
            </div>
        </div>
    );
}
