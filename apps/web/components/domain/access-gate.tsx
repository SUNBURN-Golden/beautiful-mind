import type { AppLocale } from '@/i18n/config';
import { getAccessGateCopy } from '@/i18n/domain/access-gate';
import { cn } from '@/lib/utils';

export type AccessGateStage = 'verify' | 'consent' | 'contract' | 'passed';

export type AccessGateReference = {
    label: string;
    value: string;
};

type AccessGateProps = {
    stage: AccessGateStage;
    locale: AppLocale;
    references?: AccessGateReference[];
    className?: string;
};

export function AccessGate({
    stage,
    locale,
    references = [],
    className,
}: AccessGateProps) {
    const copy = getAccessGateCopy(locale);
    const stageCopy = copy.stages[stage];

    return (
        <section className={cn('sb-space-stage rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <span className="sb-vocab-badge">{copy.badge}</span>
                    <p className="sb-type-meta">{stageCopy.label}</p>
                    <h2 className="sb-type-display-lg">
                        {stageCopy.title}
                    </h2>
                    <p className="sb-type-body-lg max-w-2xl">
                        {stageCopy.description}
                    </p>
                </div>

                <p className="sb-type-meta">{stageCopy.note}</p>

                {references.length > 0 ? (
                    <div className="space-y-3">
                        <p className="sb-vocab-label">{copy.detailsTitle}</p>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {references.map((reference) => (
                                <div key={`${reference.label}-${reference.value}`} className="sb-space-document rounded-[1rem] p-3">
                                    <dt className="sb-vocab-label">{reference.label}</dt>
                                    <dd className="sb-type-hash mt-2">
                                        {reference.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
