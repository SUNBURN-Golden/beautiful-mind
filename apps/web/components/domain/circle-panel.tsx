import type { AppLocale } from '@/i18n/config';
import {
    getCirclePanelCopy,
    type CirclePanelLensKind,
} from '@/i18n/domain/circle-panel';
import { cn } from '@/lib/utils';

export type { CirclePanelLensKind } from '@/i18n/domain/circle-panel';

export type CirclePanelEvidence = {
    id: string;
    label: string;
    hash?: string;
    contractVersion?: string;
    note?: string;
};

export type CirclePanelRecord = {
    id: string;
    title: string;
    lens: CirclePanelLensKind;
    note: string;
    lastReviewedAt?: string;
    evidence: CirclePanelEvidence[];
};

type CirclePanelProps = {
    locale: AppLocale;
    circle: CirclePanelRecord;
    className?: string;
};

export function CirclePanel({
    locale,
    circle,
    className,
}: CirclePanelProps) {
    const copy = getCirclePanelCopy(locale);

    return (
        <section className={cn('sb-space-warm rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-5">
                <header className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="sb-vocab-badge">{copy.badge}</span>
                        <span className="sb-vocab-chip sb-vocab-chip-pending">{copy.labels.staticLens}</span>
                        {circle.lastReviewedAt ? (
                            <span className="sb-vocab-chip sb-vocab-chip-pending">
                                {copy.labels.lastReviewed}: {circle.lastReviewedAt}
                            </span>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <p className="sb-type-meta">{copy.lenses[circle.lens]}</p>
                        <h2 className="sb-type-display-lg">
                            {circle.title}
                        </h2>
                        <p className="sb-type-body max-w-2xl">
                            {circle.note}
                        </p>
                    </div>
                </header>

                <div className="space-y-3">
                    <p className="sb-vocab-label">{copy.labels.evidenceTitle}</p>
                    {circle.evidence.length > 0 ? (
                        <ul className="grid gap-3">
                            {circle.evidence.map((item) => (
                                <li key={item.id} className="sb-space-document rounded-[1rem] p-4">
                                    <div className="space-y-2">
                                        <p className="sb-type-headline">{item.label}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {item.hash ? (
                                                <p className="sb-type-hash">{item.hash}</p>
                                            ) : null}
                                            {item.contractVersion ? (
                                                <p className="sb-type-meta">
                                                    {item.contractVersion}
                                                </p>
                                            ) : null}
                                            {item.note ? (
                                                <p className="sb-type-body">{item.note}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="sb-type-meta">{copy.labels.noEvidence}</p>
                    )}
                </div>

                <p className="sb-type-meta">{copy.labels.readOnlyNote}</p>
            </div>
        </section>
    );
}
