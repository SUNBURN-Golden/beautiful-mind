'use client';

import Link from 'next/link';
import { EligibilityChip, type EligibilityChipKind, type EligibilityChipState } from '@/components/domain/eligibility-chip';
import { ReceiptCard } from '@/components/domain/receipt-card';
import { SignalStack, type SignalStackItem } from '@/components/domain/signal-stack';
import { TrustRibbon, type TrustRibbonEvidence, type TrustRibbonLevel } from '@/components/domain/trust-ribbon';
import { MicroSlide, SoftFade } from '@/components/motion';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getDashboardCopy } from '@/i18n/dashboard';
import {
    formatAdmissionStatusLabel,
    formatDocumentTypeLabelForLocale,
    formatTrustLevelLabel,
    formatProcessingStateLabel,
    formatContractIdentifierLabel,
} from '@/lib/contracts/status-copy';

export type DashboardRequiredDocument = {
    type: string;
    status: string;
    processing_status: string;
    ai_confidence: number;
    purged_at: string | null;
    created_at?: string;
};

type DashboardSurfaceActiveProps = {
    locale: AppLocale;
    admissionStatus: string;
    trustLevel: string;
    soulClaimStatus: string;
    soulClaimActive: boolean;
    soulIssued: boolean;
    soulIssuedAt: string | null;
    requiredDocuments: DashboardRequiredDocument[];
};

type DashboardSurfaceLoadingProps = {
    view: 'loading';
    locale?: AppLocale;
};

type DashboardSurfaceNonActiveGateProps = {
    view: 'non_active_gate';
    currentStage?: string;
    locale?: AppLocale;
};

export type DashboardSurfaceProps =
    | DashboardSurfaceLoadingProps
    | DashboardSurfaceNonActiveGateProps
    | ({ view: 'active' } & DashboardSurfaceActiveProps);

function formatConfidence(value: number): string {
    if (value >= 1) return '100%';
    return `${Math.round(value * 100)}%`;
}

function formatTimestamp(iso: string | null, locale: AppLocale): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function buildSignalItems(
    admissionStatus: string,
    requiredDocuments: DashboardRequiredDocument[],
    trustLevel: string,
    soulClaimStatus: string,
    soulIssuedAt: string | null,
    locale: AppLocale,
): SignalStackItem[] {
    return [
        {
            id: 'sig-identity',
            kind: 'verify.id.completed',
            contractVersion: formatContractIdentifierLabel(`identity.${admissionStatus}`, locale),
            occurredAt: undefined,
        },
        {
            id: 'sig-documents',
            kind: 'verify.doc.completed',
            contractVersion: formatContractIdentifierLabel(`documents.${requiredDocuments.length}.verified`, locale),
            receiptId: requiredDocuments.length > 0 ? `${requiredDocuments.length}` : undefined,
            occurredAt: undefined,
        },
        {
            id: 'sig-consent',
            kind: 'consent.clause.signed',
            contractVersion: formatContractIdentifierLabel('consent.recorded', locale),
            occurredAt: undefined,
        },
        {
            id: 'sig-credential',
            kind: 'contract.signed',
            contractVersion: formatContractIdentifierLabel(`credential.${soulClaimStatus}`, locale),
            occurredAt: soulIssuedAt ? formatTimestamp(soulIssuedAt, locale) : undefined,
        },
    ];
}

export function DashboardSurface(props: DashboardSurfaceProps) {
    const locale = props.locale ?? LIVE_DEFAULT_LOCALE;
    const copy = getDashboardCopy(locale);

    if (props.view === 'loading') {
        return (
            <main className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen border-0 px-4 py-6 sm:px-8 sm:py-10`} lang={locale}>
                <div className="mx-auto max-w-5xl">
                    <SoftFade>
                        <section className="rounded-[1.75rem] border border-[color:var(--sb-border-warm)] bg-[color:var(--sb-surface-warm-panel)] p-6 sm:p-8">
                            <div className="space-y-3">
                                <span className="sb-vocab-badge">{copy.loading.badge}</span>
                                <h1 className="sb-type-serif-display text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.02] text-[color:var(--sb-text-warm-strong)]">
                                    {copy.loading.title}
                                </h1>
                                <p className="sb-type-body-lg max-w-2xl">{copy.loading.description}</p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-3">
                                {[0, 1, 2].map((item) => (
                                    <div
                                        key={item}
                                        aria-hidden="true"
                                        className="sb-space-document rounded-[1.25rem] p-5"
                                    >
                                        <div className="h-3 w-24 rounded-full bg-[rgba(49,41,32,0.08)]" />
                                        <div className="mt-4 h-5 w-3/4 rounded-full bg-[rgba(49,41,32,0.1)]" />
                                        <div className="mt-3 h-4 w-full rounded-full bg-[rgba(49,41,32,0.08)]" />
                                        <div className="mt-2 h-4 w-5/6 rounded-full bg-[rgba(49,41,32,0.08)]" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </SoftFade>
                </div>
            </main>
        );
    }

    if (props.view === 'non_active_gate') {
        return (
            <main className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen border-0 px-4 py-6 sm:px-8 sm:py-10`} lang={locale}>
                <div className="mx-auto max-w-4xl">
                    <SoftFade>
                        <section className="rounded-[1.75rem] border border-[color:var(--sb-border-warm)] bg-[color:var(--sb-surface-warm-panel)] p-6 sm:p-8">
                            <div className="space-y-3">
                                <span className="sb-vocab-badge">{copy.gate.badge}</span>
                                <h1 className="sb-type-serif-display text-[clamp(2rem,4.2vw,3.1rem)] leading-[1.04] text-[color:var(--sb-text-warm-strong)]">
                                    {copy.gate.title}
                                </h1>
                                <p className="sb-type-body-lg max-w-2xl">{copy.gate.description}</p>
                                {props.currentStage ? (
                                    <p className="sb-type-meta">
                                        {copy.gate.currentStageLabel}: {props.currentStage}
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Link
                                    href={withLangQuery('/apply/status', locale, LIVE_DEFAULT_LOCALE)}
                                    className="inline-flex w-fit rounded-full border border-[color:var(--sb-border-warm)] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-sm font-semibold text-[color:var(--sb-text-warm-strong)] transition-colors hover:bg-white"
                                >
                                    {copy.gate.primaryLabel}
                                </Link>
                                <Link
                                    href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)}
                                    className="inline-flex w-fit text-sm font-medium text-[color:var(--sb-text-warm-muted)] underline-offset-4 transition-colors hover:text-[color:var(--sb-text-warm-strong)] hover:underline"
                                >
                                    {copy.gate.secondaryLabel}
                                </Link>
                            </div>
                        </section>
                    </SoftFade>
                </div>
            </main>
        );
    }

    // ——— ACTIVE VIEW ———
    const { admissionStatus, trustLevel, soulClaimStatus, soulClaimActive, soulIssued, soulIssuedAt, requiredDocuments } = props;

    const trustRibbonLevel: TrustRibbonLevel = soulClaimActive ? 'verified' : trustLevel ? 'verified' : 'pending';
    const trustRibbonEvidence: TrustRibbonEvidence[] = [
        { label: copy.rows.admissionStatus, ts: formatAdmissionStatusLabel(admissionStatus, locale) },
        { label: copy.rows.trustLevel, ts: formatTrustLevelLabel(trustLevel, locale) },
        ...(soulIssuedAt ? [{ label: copy.rows.issuedAt, ts: formatTimestamp(soulIssuedAt, locale) }] : []),
    ];

    const eligibilityChips: { kind: EligibilityChipKind; state: EligibilityChipState }[] = [
        { kind: 'identity', state: 'met' },
        { kind: 'consent', state: 'met' },
        { kind: 'document', state: 'met' },
        { kind: 'contract', state: 'met' },
        { kind: 'standing', state: 'met' },
    ];

    const roomItems = [
        { key: 'counterpart', ...copy.rooms.counterpart },
        { key: 'correspondence', ...copy.rooms.correspondence },
        { key: 'attestation', ...copy.rooms.attestation },
        { key: 'report', ...copy.rooms.report },
        { key: 'revoke', ...copy.rooms.revoke },
    ];

    const signalItems = buildSignalItems(admissionStatus, requiredDocuments, trustLevel, soulClaimStatus, soulIssuedAt, locale);

    const maskedReceiptId = formatContractIdentifierLabel(`standing-${admissionStatus}`, locale);
    const maskedHash = formatContractIdentifierLabel(admissionStatus, locale);
    const maskedContractVersion = formatContractIdentifierLabel(copy.receipt.contractVersion, locale);

    return (
        <main className={`sb-space-stage-antiquarian sb-locale-${locale} min-h-screen px-4 py-10 sm:px-6 lg:px-8`} lang={locale}>
            <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-8">
                {/* Section 1 — Current standing summary */}
                <section className="sb-space-warm rounded-3xl border p-6 sm:p-8">
                    <div className="flex flex-col gap-4">
                        <div>
                            <span className="sb-vocab-badge inline-flex items-center rounded-full border border-[#d4c5a9] bg-[#f5f0e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b5e50]">
                                {copy.intro.badge}
                            </span>
                        </div>
                        <h1 className="sb-type-serif-display text-[28px] leading-[1.18] sm:text-[32px]">
                            {copy.intro.title}
                        </h1>
                        <p className="sb-type-body-lg max-w-2xl leading-[1.6]">
                            {copy.intro.description}
                        </p>
                        <TrustRibbon level={trustRibbonLevel} evidence={trustRibbonEvidence} locale={locale} />
                        <p className="sb-type-body max-w-2xl leading-[1.6]">
                            {copy.intro.note}
                        </p>
                    </div>
                </section>

                {/* Section 2 — Disabled action cards */}
                <section>
                    <div className="mb-4 flex flex-col gap-1">
                        <h2 className="sb-type-headline text-[20px] leading-[1.3] text-[color:var(--sb-stage-ink-strong)]">
                            {copy.rooms.title}
                        </h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {roomItems.map((room, i) => (
                            <MicroSlide key={room.key} delayMs={i * 60}>
                                <div
                                    className="sb-space-warm flex flex-col gap-2 rounded-2xl border p-5 opacity-60"
                                    aria-disabled="true"
                                    role="button"
                                    tabIndex={-1}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="sb-type-headline text-[16px] leading-[1.3]">
                                            {room.title}
                                        </h3>
                                        <span className="sb-type-meta shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[#9a8c7a]">
                                            {copy.actions.disabledReason}
                                        </span>
                                    </div>
                                    <p className="sb-type-body text-[14px] leading-[1.5]">
                                        {room.description}
                                    </p>
                                </div>
                            </MicroSlide>
                        ))}
                    </div>
                </section>

                {/* Section 3 — Eligibility / record summary */}
                <section>
                    <div className="mb-4 flex flex-col gap-1">
                        <span className="sb-vocab-badge inline-flex items-center rounded-full border border-[rgba(241,233,219,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--sb-stage-ink-soft)]">
                            {copy.access.badge}
                        </span>
                        <h2 className="sb-type-headline text-[20px] leading-[1.3] text-[color:var(--sb-stage-ink-strong)]">
                            {copy.access.title}
                        </h2>
                        <p className="sb-type-body text-[14px] leading-[1.5] text-[color:var(--sb-stage-ink-muted)]">
                            {copy.access.description}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {eligibilityChips.map((chip) => (
                            <EligibilityChip key={chip.kind} kind={chip.kind} state={chip.state} locale={locale} />
                        ))}
                    </div>
                </section>

                {/* Section 4 — Document record summary */}
                <section>
                    <div className="mb-4 flex flex-col gap-1">
                        <h2 className="sb-type-headline text-[20px] leading-[1.3] text-[color:var(--sb-stage-ink-strong)]">
                            {copy.documentRecord.title}
                        </h2>
                    </div>
                    {requiredDocuments.length === 0 ? (
                        <div className="sb-space-document rounded-2xl border p-5">
                            <p className="sb-type-body text-[14px] leading-[1.5]">
                                {copy.documentRecord.emptyDescription}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {requiredDocuments.map((doc, i) => (
                                <MicroSlide key={`${doc.type}-${i}`} delayMs={i * 50}>
                                    <div className="sb-space-document flex flex-col gap-2 rounded-2xl border p-5">
                                        <p className="sb-type-headline">
                                            {formatDocumentTypeLabelForLocale(doc.type, locale)}
                                        </p>
                                        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2" style={{ gridTemplateColumns: 'minmax(7rem, auto) minmax(0, 1fr)' }}>
                                            <dt className="sb-type-meta text-[12px] font-medium text-[#9a8c7a]">{copy.rows.status}</dt>
                                            <dd className="sb-type-body text-[14px]">{formatAdmissionStatusLabel(doc.status, locale)}</dd>

                                            <dt className="sb-type-meta text-[12px] font-medium text-[#9a8c7a]">{copy.rows.processing}</dt>
                                            <dd className="sb-type-body text-[14px]">{formatProcessingStateLabel(doc.processing_status, locale)}</dd>

                                            <dt className="sb-type-meta text-[12px] font-medium text-[#9a8c7a]">{copy.rows.confidence}</dt>
                                            <dd className="sb-type-body text-[14px]">{formatConfidence(doc.ai_confidence)}</dd>

                                            <dt className="sb-type-meta text-[12px] font-medium text-[#9a8c7a]">{copy.rows.purgedAt}</dt>
                                            <dd className="sb-type-body text-[14px]">
                                                {doc.purged_at ? formatTimestamp(doc.purged_at, locale) : copy.rows.notPurged}
                                            </dd>
                                        </div>
                                    </div>
                                </MicroSlide>
                            ))}
                        </div>
                    )}
                </section>

                {/* Section 5 — Collapsible evidence / audit trail */}
                <section>
                    <details className="group">
                        <summary className="sb-space-warm flex cursor-pointer items-center gap-3 rounded-2xl border p-5 transition hover:border-[#c4b89a] select-none list-none">
                            <svg
                                width="16" height="16" viewBox="0 0 16 16" fill="none"
                                className="shrink-0 transition-transform group-open:rotate-90"
                            >
                                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex flex-col gap-0.5">
                                <span className="sb-vocab-badge inline-flex items-center rounded-full border border-[#d4c5a9] bg-[#f5f0e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b5e50]">
                                    {copy.evidence.badge}
                                </span>
                                <p className="sb-type-body text-[14px] leading-[1.5]">
                                    {copy.evidence.summaryLabel}
                                </p>
                            </div>
                        </summary>
                        <div className="mt-4 flex flex-col gap-6 pl-2">
                            <ReceiptCard
                                locale={locale}
                                title={copy.receipt.title}
                                receiptId={maskedReceiptId}
                                issuedAt={soulIssuedAt ? formatTimestamp(soulIssuedAt, locale) : copy.receipt.issuedPending}
                                hash={maskedHash}
                                contractVersion={maskedContractVersion}
                                signatory={copy.receipt.signatory}
                                status={soulIssued ? 'signed' : 'updated'}
                            />
                            <SignalStack locale={locale} items={signalItems} />
                        </div>
                    </details>
                </section>
            </div>
            </div>
        </main>
    );
}