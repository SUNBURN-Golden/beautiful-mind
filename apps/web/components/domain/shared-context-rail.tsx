import type { AppLocale } from '@/i18n/config';
import {
    getSharedContextRailCopy,
    type SharedContextRailKind,
} from '@/i18n/domain/shared-context-rail';
import { cn } from '@/lib/utils';

export type { SharedContextRailKind } from '@/i18n/domain/shared-context-rail';

export type SharedContextRailItem = {
    id: string;
    kind: SharedContextRailKind;
    label: string;
    evidence: string;
    hash?: string;
};

type SharedContextRailProps = {
    locale: AppLocale;
    items: SharedContextRailItem[];
    className?: string;
};

export function SharedContextRail({
    locale,
    items,
    className,
}: SharedContextRailProps) {
    const copy = getSharedContextRailCopy(locale);

    return (
        <section className={cn('sb-space-warm rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <span className="sb-vocab-badge">{copy.badge}</span>
                    <h2 className="sb-type-display-lg">
                        {copy.title}
                    </h2>
                    <p className="sb-type-body-lg max-w-2xl">
                        {copy.description}
                    </p>
                </div>

                {items.length > 0 ? (
                    <ul className="grid gap-3">
                        {items.map((item) => (
                            <li key={item.id} className="sb-space-document rounded-[1rem] p-4">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="sb-vocab-chip sb-vocab-chip-pending">
                                            {copy.kinds[item.kind]}
                                        </span>
                                    </div>
                                    <p className="sb-type-headline">
                                        {item.label}
                                    </p>
                                    <div className="space-y-1">
                                        <p className="sb-vocab-label">{copy.labels.evidence}</p>
                                        <p className="sb-type-body">{item.evidence}</p>
                                    </div>
                                    {item.hash ? (
                                        <p className="sb-type-hash">
                                            {copy.labels.hash}: {item.hash}
                                        </p>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="sb-space-document rounded-[1rem] p-4">
                        <p className="sb-type-headline">
                            {copy.labels.emptyTitle}
                        </p>
                        <p className="sb-type-body mt-2">
                            {copy.labels.emptyDescription}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
