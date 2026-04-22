import type { AppLocale } from '@/i18n/config';
import {
    getSignalStackCopy,
    type SignalStackKind,
} from '@/i18n/domain/signal-stack';
import { cn } from '@/lib/utils';

export type { SignalStackKind } from '@/i18n/domain/signal-stack';

type SignalStackEvidence =
    | {
        hash: string;
        contractVersion?: string;
        receiptId?: string;
        occurredAt?: string;
    }
    | {
        hash?: string;
        contractVersion: string;
        receiptId?: string;
        occurredAt?: string;
    };

export type SignalStackItem = {
    id: string;
    kind: SignalStackKind;
} & SignalStackEvidence;

type SignalStackProps = {
    locale: AppLocale;
    items: SignalStackItem[];
    className?: string;
};

export function SignalStack({
    locale,
    items,
    className,
}: SignalStackProps) {
    const copy = getSignalStackCopy(locale);

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
                    <ol className="grid gap-3">
                        {items.map((item) => {
                            const itemLabel = copy.kinds[item.kind];

                            return (
                                <li key={item.id} className="sb-space-document rounded-[1rem] p-4">
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <p className="sb-type-headline">{itemLabel}</p>
                                            {item.occurredAt ? (
                                                <p className="sb-type-meta">
                                                    {copy.labels.recordedAt}: {item.occurredAt}
                                                </p>
                                            ) : null}
                                        </div>
                                        <dl className="flex flex-wrap gap-x-4 gap-y-2">
                                            {'hash' in item && item.hash ? (
                                                <div className="flex items-baseline gap-2">
                                                    <dt className="sb-vocab-label">{copy.labels.hash}</dt>
                                                    <dd className="sb-type-hash">{item.hash}</dd>
                                                </div>
                                            ) : null}
                                            {'contractVersion' in item && item.contractVersion ? (
                                                <div className="flex items-baseline gap-2">
                                                    <dt className="sb-vocab-label">{copy.labels.contractVersion}</dt>
                                                    <dd className="sb-type-body">{item.contractVersion}</dd>
                                                </div>
                                            ) : null}
                                            {item.receiptId ? (
                                                <div className="flex items-baseline gap-2">
                                                    <dt className="sb-vocab-label">{copy.labels.receiptId}</dt>
                                                    <dd className="sb-type-body">{item.receiptId}</dd>
                                                </div>
                                            ) : null}
                                        </dl>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
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
