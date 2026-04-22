'use client';

import Link from 'next/link';
import { EligibilityChip, type EligibilityChipKind } from '@/components/domain/eligibility-chip';
import { ReceiptCard } from '@/components/domain/receipt-card';
import { SignalStack, type SignalStackItem } from '@/components/domain/signal-stack';
import { TrustRibbon, type TrustRibbonEvidence, type TrustRibbonLevel } from '@/components/domain/trust-ribbon';
import { MicroSlide, SoftFade } from '@/components/motion';
import { LIVE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getDashboardCopy } from '@/i18n/dashboard';

export type DashboardRequiredDocument = {
    type?: string;
    status?: string;
    processing_status?: string;
    ai_confidence?: number | null;
    purged_at?: string | null;
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

type DashboardSurfaceActiveProps = {
    view: 'active';
    locale?: AppLocale;
    admissionStatus: string;
    trustLevel: string;
    sbtStatus: string;
    sbtIsActive: boolean;
    soulIssued: boolean;
    soulIssuedAt: string | null;
    requiredDocuments: DashboardRequiredDocument[];
    isSigningOut: boolean;
    onSignOut: () => void;
};

export type DashboardSurfaceProps =
    | DashboardSurfaceLoadingProps
    | DashboardSurfaceNonActiveGateProps
    | DashboardSurfaceActiveProps;

type DashboardLinkKey =
    | 'counterpart'
    | 'correspondence'
    | 'attestation'
    | 'report'
    | 'revoke';

const DASHBOARD_ROOM_ROUTES: Record<DashboardLinkKey, string> = {
    counterpart: '/match',
    correspondence: '/chat',
    attestation: '/review',
    report: '/report',
    revoke: '/revoke',
};

const DASHBOARD_ELIGIBILITY_KINDS: EligibilityChipKind[] = [
    'identity',
    'consent',
    'document',
    'contract',
    'standing',
];

export function DashboardSurface(props: DashboardSurfaceProps) {
    const locale = props.locale ?? LIVE_DEFAULT_LOCALE;
    const copy = getDashboardCopy(locale);

    if (props.view === 'loading') {
        return (
            <main className={`sb-space-warm sb-locale-${locale} min-h-screen border-0 px-4 py-6 sm:px-8 sm:py-10`} lang={locale}>
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
            <main className={`sb-space-warm sb-locale-${locale} min-h-screen border-0 px-4 py-6 sm:px-8 sm:py-10`} lang={locale}>
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

    const {
        admissionStatus,
        trustLevel,
        sbtStatus,
        sbtIsActive,
        soulIssued,
        soulIssuedAt,
        requiredDocuments,
        isSigningOut,
        onSignOut,
    } = props;

    const ribbonLevel = resolveTrustRibbonLevel({ trustLevel, sbtIsActive, soulIssued });
    const ribbonEvidence = buildTrustEvidence({
        admissionStatus,
        trustLevel,
        soulIssuedAt,
        locale,
    });
    const roomKeys = Object.keys(DASHBOARD_ROOM_ROUTES) as DashboardLinkKey[];
    const signalItems = buildSignalItems({
        admissionStatus,
        trustLevel,
        sbtStatus,
        soulIssued,
        soulIssuedAt,
        requiredDocuments,
        locale,
    });
    const standingReceiptId = `standing-${toRecordToken(admissionStatus, 'active')}`;
    const standingHash = [
        'standing',
        toRecordToken(admissionStatus, 'active'),
        toRecordToken(trustLevel, 'verified'),
        toRecordToken(sbtStatus, 'credential'),
    ].join(':');

    return (
        <main className={`sb-space-warm sb-locale-${locale} min-h-screen border-0 px-4 py-6 sm:px-8 sm:py-10`} lang={locale}>
            <div className="mx-auto max-w-6xl space-y-6">
                <SoftFade>
                    <section className="rounded-[1.75rem] border border-[color:var(--sb-border-warm)] bg-[color:var(--sb-surface-warm-panel)] p-6 sm:p-8">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl space-y-3">
                                <span className="sb-vocab-badge">{copy.intro.badge}</span>
                                <h1 className="sb-type-serif-display text-[clamp(2.2rem,4.5vw,3.9rem)] leading-[1.02] text-[color:var(--sb-text-warm-strong)]">
                                    {copy.intro.title}
                                </h1>
                                <p className="sb-type-body-lg max-w-2xl">{copy.intro.description}</p>
                                <p className="sb-type-body max-w-2xl">{copy.intro.note}</p>
                            </div>

                            <button
                                type="button"
                                onClick={onSignOut}
                                disabled={isSigningOut}
                                className="inline-flex w-fit text-sm font-medium text-[color:var(--sb-text-warm-muted)] underline-offset-4 transition-colors hover:text-[color:var(--sb-text-warm-strong)] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSigningOut ? copy.signOut.busy : copy.signOut.idle}
                            </button>
                        </div>

                        <div className="mt-6">
                            <TrustRibbon
                                locale={locale}
                                level={ribbonLevel}
                                evidence={ribbonEvidence}
                            />
                        </div>
                    </section>
                </SoftFade>

                <SoftFade delayMs={50}>
                    <section className="rounded-[1.75rem] border border-[color:var(--sb-border-warm)] bg-[rgba(255,255,255,0.42)] p-6">
                        <div className="space-y-3">
                            <span className="sb-vocab-badge">{copy.access.badge}</span>
                            <h2 className="sb-type-display-lg">{copy.access.title}</h2>
                            <p className="sb-type-body-lg max-w-3xl">{copy.access.description}</p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {DASHBOARD_ELIGIBILITY_KINDS.map((kind) => (
                                <EligibilityChip
                                    key={kind}
                                    locale={locale}
                                    kind={kind}
                                    state="met"
                                />
                            ))}
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="sb-space-document rounded-[1.25rem] p-5">
                                <p className="sb-vocab-label">{copy.rooms.title}</p>
                                <ul className="mt-4 space-y-3">
                                    {roomKeys.map((key, index) => (
                                        <li key={key}>
                                            <MicroSlide
                                                delayMs={index * 25}
                                                className={index < roomKeys.length - 1 ? 'border-b border-[color:var(--sb-border-warm)] pb-3' : ''}
                                            >
                                                <div className="space-y-1">
                                                    <Link
                                                        href={withLangQuery(DASHBOARD_ROOM_ROUTES[key], locale, LIVE_DEFAULT_LOCALE)}
                                                        className="sb-type-headline inline-flex underline-offset-4 transition-colors hover:text-[color:var(--sb-text-warm-strong)] hover:underline"
                                                    >
                                                        {copy.rooms[key].title}
                                                    </Link>
                                                    <p className="sb-type-body">{copy.rooms[key].description}</p>
                                                </div>
                                            </MicroSlide>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="sb-space-document rounded-[1.25rem] p-5">
                                <p className="sb-vocab-label">{copy.documentRecord.title}</p>
                                {requiredDocuments.length > 0 ? (
                                    <ul className="mt-4 space-y-4">
                                        {requiredDocuments.map((doc, index) => (
                                            <li key={`${doc.type ?? 'document'}-${index}`} className="border-b border-[color:var(--sb-border-warm)] pb-4 last:border-b-0 last:pb-0">
                                                <p className="sb-type-headline">
                                                    {doc.type || copy.documentRecord.fallbackTitle}
                                                </p>
                                                <dl className="mt-3 grid gap-2">
                                                    <div className="flex items-baseline justify-between gap-4">
                                                        <dt className="sb-vocab-label">{copy.rows.status}</dt>
                                                        <dd className="sb-type-body">{doc.status || copy.rows.notAvailable}</dd>
                                                    </div>
                                                    <div className="flex items-baseline justify-between gap-4">
                                                        <dt className="sb-vocab-label">{copy.rows.processing}</dt>
                                                        <dd className="sb-type-body">{doc.processing_status || copy.rows.pending}</dd>
                                                    </div>
                                                    <div className="flex items-baseline justify-between gap-4">
                                                        <dt className="sb-vocab-label">{copy.rows.confidence}</dt>
                                                        <dd className="sb-type-body">
                                                            {typeof doc.ai_confidence === 'number'
                                                                ? doc.ai_confidence.toFixed(2)
                                                                : copy.rows.notAvailable}
                                                        </dd>
                                                    </div>
                                                    <div className="flex items-baseline justify-between gap-4">
                                                        <dt className="sb-vocab-label">{copy.rows.purgedAt}</dt>
                                                        <dd className="sb-type-body">{doc.purged_at || copy.rows.notPurged}</dd>
                                                    </div>
                                                </dl>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="sb-type-body mt-4">{copy.documentRecord.emptyDescription}</p>
                                )}
                            </div>
                        </div>
                    </section>
                </SoftFade>

                <SoftFade delayMs={100}>
                    <ReceiptCard
                        locale={locale}
                        title={copy.receipt.title}
                        receiptId={standingReceiptId}
                        issuedAt={soulIssuedAt || copy.receipt.issuedPending}
                        hash={standingHash}
                        contractVersion={copy.receipt.contractVersion}
                        signatory={copy.receipt.signatory}
                        status={soulIssued ? 'signed' : 'updated'}
                    />
                </SoftFade>

                <SoftFade delayMs={140}>
                    <SignalStack locale={locale} items={signalItems} />
                </SoftFade>
            </div>
        </main>
    );
}

function resolveTrustRibbonLevel({
    trustLevel,
    sbtIsActive,
    soulIssued,
}: {
    trustLevel: string;
    sbtIsActive: boolean;
    soulIssued: boolean;
}): TrustRibbonLevel {
    if (soulIssued || sbtIsActive) {
        return 'verified';
    }

    const normalized = trustLevel.toLowerCase();
    if (normalized.includes('partial')) {
        return 'partial';
    }

    if (normalized.includes('pending') || normalized.includes('review')) {
        return 'pending';
    }

    return 'partial';
}

function buildTrustEvidence({
    admissionStatus,
    trustLevel,
    soulIssuedAt,
    locale,
}: {
    admissionStatus: string;
    trustLevel: string;
    soulIssuedAt: string | null;
    locale: AppLocale;
}): TrustRibbonEvidence[] {
    const copy = getDashboardCopy(locale);

    return [
        { label: `${copy.rows.admissionStatus}: ${admissionStatus}` },
        { label: `${copy.rows.trustLevel}: ${trustLevel}` },
        { label: `${copy.rows.issuedAt}: ${soulIssuedAt || copy.rows.notAvailable}` },
    ];
}

function buildSignalItems({
    admissionStatus,
    trustLevel,
    sbtStatus,
    soulIssued,
    soulIssuedAt,
    requiredDocuments,
    locale,
}: {
    admissionStatus: string;
    trustLevel: string;
    sbtStatus: string;
    soulIssued: boolean;
    soulIssuedAt: string | null;
    requiredDocuments: DashboardRequiredDocument[];
    locale: AppLocale;
}): SignalStackItem[] {
    const copy = getDashboardCopy(locale);
    const documentCountReceipt = locale === 'ko'
        ? `${requiredDocuments.length}건 기록`
        : `${requiredDocuments.length} records`;

    const items: SignalStackItem[] = [
        {
            id: 'identity-verified',
            kind: 'verify.id.completed' as const,
            contractVersion: `identity.${toRecordToken(admissionStatus, 'verified')}`,
            receiptId: admissionStatus,
        },
        {
            id: 'consent-recorded',
            kind: 'consent.clause.signed' as const,
            contractVersion: 'consent.recorded',
            receiptId: trustLevel,
        },
        {
            id: 'contract-recorded',
            kind: soulIssued ? ('contract.signed' as const) : ('contract.updated' as const),
            contractVersion: `credential.${toRecordToken(sbtStatus, 'active')}`,
            occurredAt: soulIssuedAt || undefined,
            receiptId: sbtStatus,
        },
    ];

    if (requiredDocuments.length > 0) {
        items.splice(1, 0, {
            id: 'document-verified',
            kind: 'verify.doc.completed' as const,
            contractVersion: `documents.${requiredDocuments.length}.verified`,
            occurredAt: firstDocumentTimestamp(requiredDocuments) || undefined,
            receiptId: documentCountReceipt,
        });
    }

    if (soulIssued || soulIssuedAt) {
        items.push({
            id: 'receipt-generated',
            kind: 'receipt.generated' as const,
            contractVersion: copy.receipt.contractVersion,
            occurredAt: soulIssuedAt || undefined,
            receiptId: `standing-${toRecordToken(admissionStatus, 'active')}`,
        });
    }

    return items;
}

function firstDocumentTimestamp(requiredDocuments: DashboardRequiredDocument[]) {
    for (const document of requiredDocuments) {
        if (document.purged_at) {
            return document.purged_at;
        }
    }

    return null;
}

function toRecordToken(value: string, fallback: string) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
}
