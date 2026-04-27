import type { DashboardRequiredDocument } from '@/components/surfaces/dashboard-surface';
import type { AppLocale } from '@/i18n/config';

type DashboardActiveFixture = {
    view: 'active';
    admissionStatus: string;
    trustLevel: string;
    sbtStatus: string;
    sbtIsActive: boolean;
    soulIssued: boolean;
    soulIssuedAt: string | null;
    requiredDocuments: DashboardRequiredDocument[];
};

const dashboardFixtureStrings: Record<AppLocale, {
    nonActiveStage: string;
    admissionStatus: string;
    trustLevel: string;
    sbtStatus: string;
    soulIssuedAt: string;
    requiredDocuments: DashboardRequiredDocument[];
}> = {
    en: {
        nonActiveStage: 'REVIEW_PENDING',
        admissionStatus: 'APPROVED',
        trustLevel: 'LEVEL_3',
        sbtStatus: 'ACTIVE',
        soulIssuedAt: '2026-04-10 19:40 KST',
        requiredDocuments: [
            {
                type: 'Graduation record',
                status: 'VERIFIED',
                processing_status: 'COMPLETED',
                ai_confidence: 0.98,
                purged_at: '2026-04-11 09:00 KST',
            },
            {
                type: 'Income record',
                status: 'VERIFIED',
                processing_status: 'COMPLETED',
                ai_confidence: 0.96,
                purged_at: '2026-04-11 09:00 KST',
            },
        ],
    },
    ko: {
        nonActiveStage: '심사 대기',
        admissionStatus: '승인 완료',
        trustLevel: '3단계',
        sbtStatus: '정상 발급',
        soulIssuedAt: '2026-04-10 19:40 KST',
        requiredDocuments: [
            {
                type: '졸업 증빙',
                status: '검증 완료',
                processing_status: '처리 완료',
                ai_confidence: 0.98,
                purged_at: '2026-04-11 09:00 KST 삭제',
            },
            {
                type: '소득 증빙',
                status: '검증 완료',
                processing_status: '처리 완료',
                ai_confidence: 0.96,
                purged_at: '2026-04-11 09:00 KST 삭제',
            },
        ],
    },
};

export const dashboardLoadingFixture = {
    view: 'loading',
} as const;

export function getDashboardNonActiveFixture(_locale: AppLocale) {
    return {
        view: 'non_active_gate' as const,
    };
}

export function getDashboardActiveFixture(locale: AppLocale): DashboardActiveFixture {
    const copy = dashboardFixtureStrings[locale];

    return {
        view: 'active',
        admissionStatus: copy.admissionStatus,
        trustLevel: copy.trustLevel,
        sbtStatus: copy.sbtStatus,
        sbtIsActive: true,
        soulIssued: true,
        soulIssuedAt: copy.soulIssuedAt,
        requiredDocuments: copy.requiredDocuments,
    };
}
