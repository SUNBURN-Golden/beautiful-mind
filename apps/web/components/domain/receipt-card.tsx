import type { AppLocale } from '@/i18n/config';
import {
    getReceiptCardCopy,
    type ReceiptCardStatus,
} from '@/i18n/domain/receipt-card';
import { cn } from '@/lib/utils';

export type { ReceiptCardStatus } from '@/i18n/domain/receipt-card';

type ReceiptCardProps = {
    locale: AppLocale;
    title: string;
    receiptId: string;
    issuedAt: string;
    hash: string;
    contractVersion?: string;
    signatory?: string;
    status?: ReceiptCardStatus;
    className?: string;
};

export function ReceiptCard({
    locale,
    title,
    receiptId,
    issuedAt,
    hash,
    contractVersion,
    signatory,
    status = 'signed',
    className,
}: ReceiptCardProps) {
    const copy = getReceiptCardCopy(locale);

    return (
        <section className={cn('sb-space-document rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="sb-vocab-badge">{copy.badge}</span>
                        <span className="sb-vocab-chip sb-vocab-chip-pending">
                            {copy.statuses[status]}
                        </span>
                    </div>
                    <h2 className="sb-type-display-lg">
                        {title}
                    </h2>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <dt className="sb-vocab-label">{copy.labels.receiptId}</dt>
                        <dd className="sb-type-body mt-2">{receiptId}</dd>
                    </div>
                    <div>
                        <dt className="sb-vocab-label">{copy.labels.issuedAt}</dt>
                        <dd className="sb-type-body mt-2">{issuedAt}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="sb-vocab-label">{copy.labels.hash}</dt>
                        <dd className="sb-type-hash mt-2">{hash}</dd>
                    </div>
                    {contractVersion ? (
                        <div>
                            <dt className="sb-vocab-label">{copy.labels.contractVersion}</dt>
                            <dd className="sb-type-body mt-2">{contractVersion}</dd>
                        </div>
                    ) : null}
                    {signatory ? (
                        <div>
                            <dt className="sb-vocab-label">{copy.labels.signatory}</dt>
                            <dd className="sb-type-body mt-2">{signatory}</dd>
                        </div>
                    ) : null}
                </dl>

                <p className="sb-type-meta">{copy.labels.note}</p>
            </div>
        </section>
    );
}
