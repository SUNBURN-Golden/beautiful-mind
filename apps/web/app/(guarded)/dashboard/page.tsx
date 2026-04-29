'use client';

import { Suspense } from 'react';
import { DashboardSurface, type DashboardRequiredDocument } from '@/components/surfaces/dashboard-surface';
import { LIVE_DEFAULT_LOCALE } from '@/i18n/config';
import { useAppLocale } from '@/i18n/use-app-locale';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { useStatus } from '@/lib/useStatus';

function toDocumentList(value: unknown): DashboardRequiredDocument[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (item && typeof item === 'object' ? (item as DashboardRequiredDocument) : null))
        .filter((item): item is DashboardRequiredDocument => item !== null);
}

type DashboardPageContentProps = {
    locale: 'en' | 'ko';
};

function DashboardPageContent({ locale }: DashboardPageContentProps) {
    const { status, isLoading, currentStage } = useStatus();
    const stage = currentStage;

    if (isLoading) {
        return <DashboardSurface view="loading" locale={locale} />;
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return <DashboardSurface view="non_active_gate" currentStage={stage} locale={locale} />;
    }

    const meta = status?.meta || {};
    const requiredDocuments = toDocumentList(meta.required_documents);
    const trustLevel = typeof meta.trust_level === 'string' ? meta.trust_level : 'ADMISSION_VERIFIED';
    const soulClaimStatus = typeof meta.soul_claim_status === 'string' ? meta.soul_claim_status : ADMISSION_STAGES.ACTIVE;
    const soulIssued = meta.soul_credential_issued === true;
    const soulIssuedAt = typeof meta.soul_credential_issued_at === 'string' ? meta.soul_credential_issued_at : null;
    const admissionStatus = typeof meta.admission_status === 'string' ? meta.admission_status : ADMISSION_STAGES.ACTIVE;

    return (
        <DashboardSurface
            view="active"
            locale={locale}
            admissionStatus={admissionStatus}
            trustLevel={trustLevel}
            soulClaimStatus={soulClaimStatus}
            soulClaimActive={soulClaimStatus === ADMISSION_STAGES.ACTIVE}
            soulIssued={soulIssued}
            soulIssuedAt={soulIssuedAt}
            requiredDocuments={requiredDocuments}
        />
    );
}

function DashboardPageResolved() {
    const locale = useAppLocale(LIVE_DEFAULT_LOCALE);
    return <DashboardPageContent locale={locale} />;
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardPageContent locale={LIVE_DEFAULT_LOCALE} />}>
            <DashboardPageResolved />
        </Suspense>
    );
}
