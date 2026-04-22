// NOTE: fixture-only until Phase 8+. Do not wire to live API.
import type { AppLocale } from '@/i18n/config';
import {
    getIntroductionTileCopy,
    type IntroductionTileState,
} from '@/i18n/domain/introduction-tile';
import { cn } from '@/lib/utils';

export type { IntroductionTileState } from '@/i18n/domain/introduction-tile';

type IntroductionTileProps = {
    locale: AppLocale;
    state: IntroductionTileState;
    sponsorLabel: string;
    counterpartLabel: string;
    sharedBasis: string;
    referenceHash?: string;
    contractVersion?: string;
    className?: string;
};

export function IntroductionTile({
    locale,
    state,
    sponsorLabel,
    counterpartLabel,
    sharedBasis,
    referenceHash,
    contractVersion,
    className,
}: IntroductionTileProps) {
    const copy = getIntroductionTileCopy(locale);
    const stateCopy = copy.states[state];

    return (
        <section className={cn('sb-space-warm rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <span className="sb-vocab-badge">{copy.badge}</span>
                    <p className="sb-type-meta">{copy.freezeNotice}</p>
                    <h2 className="sb-type-display-lg">
                        {stateCopy.title}
                    </h2>
                    <p className="sb-type-body-lg max-w-2xl">
                        {stateCopy.description}
                    </p>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="sb-space-document rounded-[1rem] p-4">
                        <dt className="sb-vocab-label">{copy.labels.sponsor}</dt>
                        <dd className="sb-type-body mt-2">{sponsorLabel}</dd>
                    </div>
                    <div className="sb-space-document rounded-[1rem] p-4">
                        <dt className="sb-vocab-label">{copy.labels.counterpart}</dt>
                        <dd className="sb-type-body mt-2">{counterpartLabel}</dd>
                    </div>
                    <div className="sb-space-document rounded-[1rem] p-4 sm:col-span-2">
                        <dt className="sb-vocab-label">{copy.labels.sharedBasis}</dt>
                        <dd className="sb-type-body mt-2">{sharedBasis}</dd>
                    </div>
                    {referenceHash ? (
                        <div className="sb-space-document rounded-[1rem] p-4">
                            <dt className="sb-vocab-label">{copy.labels.hash}</dt>
                            <dd className="sb-type-hash mt-2">{referenceHash}</dd>
                        </div>
                    ) : null}
                    {contractVersion ? (
                        <div className="sb-space-document rounded-[1rem] p-4">
                            <dt className="sb-vocab-label">{copy.labels.contractVersion}</dt>
                            <dd className="sb-type-body mt-2">{contractVersion}</dd>
                        </div>
                    ) : null}
                </dl>
            </div>
        </section>
    );
}
