'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSurface, type DashboardRequiredDocument } from '@/components/surfaces/dashboard-surface';
import { LIVE_DEFAULT_LOCALE, withLangQuery } from '@/i18n/config';
import { useAppLocale } from '@/i18n/use-app-locale';
import { createClient } from '@/utils/supabase/client';
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
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    if (isLoading) {
        return <DashboardSurface view="loading" locale={locale} />;
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return <DashboardSurface view="non_active_gate" currentStage={stage} locale={locale} />;
    }

    const meta = status?.meta || {};
    const requiredDocuments = toDocumentList(meta.required_documents);
    const trustLevel = typeof meta.trust_level === 'string' ? meta.trust_level : 'ADMISSION_VERIFIED';
    const sbtStatus = typeof meta.sbt_status === 'string' ? meta.sbt_status : ADMISSION_STAGES.ACTIVE;
    const soulIssued = meta.soul_credential_issued === true;
    const soulIssuedAt = typeof meta.soul_credential_issued_at === 'string' ? meta.soul_credential_issued_at : null;
    const admissionStatus = typeof meta.admission_status === 'string' ? meta.admission_status : ADMISSION_STAGES.ACTIVE;

    const handleLogout = async () => {
        if (isSigningOut) return;
        setIsSigningOut(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } finally {
            router.replace(withLangQuery('/login', locale, LIVE_DEFAULT_LOCALE));
            router.refresh();
            setIsSigningOut(false);
        }
    };

    return (
        <DashboardSurface
            view="active"
            locale={locale}
            admissionStatus={admissionStatus}
            trustLevel={trustLevel}
            sbtStatus={sbtStatus}
            sbtIsActive={sbtStatus === ADMISSION_STAGES.ACTIVE}
            soulIssued={soulIssued}
            soulIssuedAt={soulIssuedAt}
            requiredDocuments={requiredDocuments}
            isSigningOut={isSigningOut}
            onSignOut={handleLogout}
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
