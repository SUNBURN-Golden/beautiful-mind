'use client';

import Link from 'next/link';
import { ActiveStatusChip, ActiveSurfaceIntro } from '@/components/active-patterns';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowInset,
    FlowPagePanel,
    FlowPageShell,
    PageActionRow,
    ReferenceDetailsCard,
} from '@/components/screen-patterns';
import { PageLoadingState, SecondaryButton, StageTransitionNotice } from '@/components/ui-kit';
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

export function DashboardSurface(props: DashboardSurfaceProps) {
    const locale = props.locale ?? LIVE_DEFAULT_LOCALE;
    const copy = getDashboardCopy(locale);

    if (props.view === 'loading') {
        return (
            <PageLoadingState
                title={copy.loading.title}
                description={copy.loading.description}
                lines={4}
            />
        );
    }

    if (props.view === 'non_active_gate') {
        return (
            <StageTransitionNotice
                currentStep={props.currentStage}
                title={copy.gate.title}
                description={copy.gate.description}
                primaryLabel={copy.gate.primaryLabel}
                secondaryLabel={copy.gate.secondaryLabel}
            />
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

    return (
        <div className={`sb-locale-${locale}`} lang={locale}>
            <FlowPageShell
                maxWidth="max-w-5xl"
                className="sb-stage-shell sb-dashboard-stage"
                support={(
                    <>
                        {copy.support.prefix}{' '}
                        <Link href={withLangQuery('/manual', locale, LIVE_DEFAULT_LOCALE)} className="font-semibold underline underline-offset-2">
                            {copy.support.linkLabel}
                        </Link>{' '}
                        {copy.support.suffix}
                    </>
                )}
            >
                <FlowPagePanel className="sb-surface-panel sb-dashboard-hero">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <ActiveSurfaceIntro
                            title={copy.intro.title}
                            description={copy.intro.description}
                            meta={(
                                <>
                                    <ActiveStatusChip tone="success">
                                        {copy.meta.admission} <span className="ml-1 font-mono text-[10px]">{admissionStatus}</span>
                                    </ActiveStatusChip>
                                    <ActiveStatusChip tone="info">
                                        {copy.meta.trust} <span data-testid="trust-level-badge" className="ml-1 font-mono text-[10px]">{trustLevel}</span>
                                    </ActiveStatusChip>
                                    <ActiveStatusChip tone={sbtIsActive ? 'success' : 'warning'}>
                                        {copy.meta.soul} <span data-testid="sbt-status-badge" className="ml-1 font-mono text-[10px]">{sbtStatus}</span>
                                    </ActiveStatusChip>
                                    <ActiveStatusChip tone={soulIssued ? 'success' : 'warning'}>
                                        {copy.meta.credential} <span className="ml-1 font-mono text-[10px]">{soulIssued ? copy.meta.issued : copy.meta.pending}</span>
                                    </ActiveStatusChip>
                                </>
                            )}
                            note={copy.intro.note}
                        />

                        <div className="w-full sm:w-32">
                            <SecondaryButton className="sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-dashboard-signout" onClick={onSignOut} disabled={isSigningOut}>
                                {isSigningOut ? copy.signOut.busy : copy.signOut.idle}
                            </SecondaryButton>
                        </div>
                    </div>

                    <FlowInfoGrid className="mt-6">
                        <FlowInfoCard
                            className="sb-surface-subpanel sb-dashboard-info-card"
                            title={copy.infoCards.startHereTitle}
                            description={copy.infoCards.startHereDescription}
                        />
                        <FlowInfoCard
                            className="sb-surface-subpanel sb-dashboard-info-card"
                            title={copy.infoCards.verifiedTitle}
                            description={copy.infoCards.verifiedDescription}
                        />
                    </FlowInfoGrid>
                </FlowPagePanel>

                <section className="grid gap-6 md:grid-cols-2">
                    <FlowPagePanel className="sb-surface-panel sb-dashboard-panel">
                        <h2 className="liquid-title sb-section-title text-[22px] font-semibold">{copy.actions.title}</h2>
                        <p className="liquid-copy sb-surface-section-copy mt-2 text-[14px]">
                            {copy.actions.description}
                        </p>

                        <div className="mt-5 space-y-4">
                            <div className="sb-surface-subpanel sb-dashboard-action-card">
                                <p className="sb-dashboard-card-title">{copy.actions.connectionsTitle}</p>
                                <p className="sb-dashboard-card-copy mt-1 text-[13px]">{copy.actions.connectionsDescription}</p>
                                <PageActionRow className="sb-action-cluster mt-3">
                                    <Link href={withLangQuery('/match', locale, LIVE_DEFAULT_LOCALE)} className="liquid-btn liquid-btn-primary sb-pill-action sb-pill-action-inline sb-pill-action-dark sb-dashboard-action-link">{copy.actions.openMatches}</Link>
                                    <Link href={withLangQuery('/chat', locale, LIVE_DEFAULT_LOCALE)} className="liquid-btn liquid-btn-secondary sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-dashboard-action-link">{copy.actions.openChat}</Link>
                                </PageActionRow>
                            </div>

                            <div className="sb-surface-subpanel sb-dashboard-action-card">
                                <p className="sb-dashboard-card-title">{copy.actions.trustTitle}</p>
                                <p className="sb-dashboard-card-copy mt-1 text-[13px]">{copy.actions.trustDescription}</p>
                                <PageActionRow className="sb-action-cluster mt-3">
                                    <Link href={withLangQuery('/review', locale, LIVE_DEFAULT_LOCALE)} className="liquid-btn liquid-btn-primary sb-pill-action sb-pill-action-inline sb-pill-action-dark sb-dashboard-action-link">{copy.actions.openAttestation}</Link>
                                    <Link href={withLangQuery('/report', locale, LIVE_DEFAULT_LOCALE)} className="liquid-btn liquid-btn-secondary sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-dashboard-action-link">{copy.actions.openReport}</Link>
                                    <Link href={withLangQuery('/revoke', locale, LIVE_DEFAULT_LOCALE)} className="liquid-btn liquid-btn-secondary sb-pill-action sb-pill-action-inline sb-pill-action-soft sb-dashboard-action-link">{copy.actions.openRevoke}</Link>
                                </PageActionRow>
                            </div>
                        </div>
                    </FlowPagePanel>

                    <FlowPagePanel className="sb-surface-panel sb-dashboard-panel">
                        <h2 className="liquid-title sb-section-title text-[22px] font-semibold">{copy.reference.title}</h2>
                        <p className="liquid-copy sb-surface-section-copy mt-2 text-[14px]">
                            {copy.reference.description}
                        </p>

                        <FlowInfoGrid className="mt-5">
                            <ReferenceDetailsCard
                                title={copy.reference.accountStatusTitle}
                                rows={[
                                    { label: copy.rows.admissionStatus, value: admissionStatus },
                                    { label: copy.rows.trustLevel, value: trustLevel },
                                    { label: copy.rows.sbtStatus, value: sbtStatus },
                                    { label: copy.rows.credential, value: soulIssued ? copy.meta.issued : copy.meta.pending },
                                    { label: copy.rows.issuedAt, value: soulIssuedAt || copy.rows.notAvailable },
                                ]}
                                className="sb-surface-reference sb-dashboard-reference-card h-full"
                            />
                            <FlowInset title={copy.reference.retentionTitle} className="sb-surface-reference sb-dashboard-inset h-full">
                                {copy.reference.retentionBody}
                            </FlowInset>
                        </FlowInfoGrid>
                    </FlowPagePanel>
                </section>

                <FlowPagePanel className="sb-surface-panel sb-dashboard-panel">
                    <h2 className="liquid-title sb-section-title text-[22px] font-semibold">{copy.reference.documentReferenceTitle}</h2>
                    <p className="liquid-copy sb-surface-section-copy mt-2 text-[14px]">
                        {copy.reference.documentReferenceDescription}
                    </p>

                    {requiredDocuments.length === 0 ? (
                        <FlowInset title={copy.reference.noDocumentTitle} className="sb-surface-reference sb-dashboard-inset mt-5">
                            {copy.reference.noDocumentBody}
                        </FlowInset>
                    ) : (
                        <FlowInfoGrid className="mt-5 md:grid-cols-2">
                            {requiredDocuments.map((doc, index) => (
                                <ReferenceDetailsCard
                                    key={`${doc.type || 'document'}-${index}`}
                                    title={doc.type || copy.reference.documentFallbackTitle}
                                    rows={[
                                        { label: copy.rows.status, value: doc.status || copy.rows.unknown },
                                        { label: copy.rows.processing, value: doc.processing_status || copy.rows.pending },
                                        { label: copy.rows.confidence, value: typeof doc.ai_confidence === 'number' ? doc.ai_confidence.toFixed(2) : copy.rows.na },
                                        { label: copy.rows.purgedAt, value: doc.purged_at || copy.rows.notPurged },
                                    ]}
                                    className="sb-surface-reference sb-dashboard-document-card"
                                />
                            ))}
                        </FlowInfoGrid>
                    )}
                </FlowPagePanel>
            </FlowPageShell>
        </div>
    );
}
