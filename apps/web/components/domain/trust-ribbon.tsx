import type { AppLocale } from '@/i18n/config';
import { getTrustRibbonCopy } from '@/i18n/domain/trust-ribbon';
import { cn } from '@/lib/utils';

export type TrustRibbonLevel = 'verified' | 'partial' | 'pending' | 'none';

export type TrustRibbonEvidence = {
    label: string;
    hash?: string;
    ts?: string;
};

type TrustRibbonProps = {
    level: TrustRibbonLevel;
    evidence?: TrustRibbonEvidence[];
    locale: AppLocale;
    className?: string;
};

export function TrustRibbon({
    level,
    evidence = [],
    locale,
    className,
}: TrustRibbonProps) {
    const copy = getTrustRibbonCopy(locale);
    const levelCopy = copy.levels[level];

    return (
        <section className={cn('sb-space-document rounded-[1.25rem] p-4 sm:p-5', className)} lang={locale}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="sb-vocab-badge">{copy.badge}</span>
                        <h2 className="sb-type-headline">
                            {levelCopy.title}
                        </h2>
                    </div>
                    <p className="sb-type-body">
                        {levelCopy.description}
                    </p>
                </div>

                {evidence.length > 0 ? (
                    <div className="flex flex-wrap gap-2 lg:max-w-[28rem] lg:justify-end">
                        {evidence.map((item) => (
                            <div
                                key={`${item.label}-${item.hash ?? item.ts ?? 'evidence'}`}
                                className="rounded-2xl border border-transparent bg-transparent px-0 py-0 text-right"
                            >
                                <p className="sb-vocab-label">{copy.labels.evidence}</p>
                                <p className="sb-type-meta mt-1">{item.label}</p>
                                {item.hash ? (
                                    <p className="sb-type-hash mt-1 text-[0.76rem]">
                                        {copy.labels.hash}: {item.hash}
                                    </p>
                                ) : null}
                                {item.ts ? (
                                    <p className="sb-type-meta mt-1">
                                        {copy.labels.timestamp}: {item.ts}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
