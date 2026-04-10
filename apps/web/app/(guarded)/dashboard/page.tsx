'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { useStatus } from '@/lib/useStatus';
import { PageLoadingState, SecondaryButton, StageTransitionNotice } from '@/components/ui-kit';
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

type RequiredDocumentMeta = {
    type?: string;
    status?: string;
    processing_status?: string;
    ai_confidence?: number | null;
    purged_at?: string | null;
};

function toDocumentList(value: unknown): RequiredDocumentMeta[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (item && typeof item === 'object' ? (item as RequiredDocumentMeta) : null))
        .filter((item): item is RequiredDocumentMeta => item !== null);
}

export default function DashboardPage() {
    const { status, isLoading, currentStage } = useStatus();
    const stage = currentStage;
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    if (isLoading) {
        return (
            <PageLoadingState
                title="Loading your ACTIVE home"
                description="We’re syncing your access, trust summary, and current dashboard actions."
                lines={4}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re syncing your admission route"
                description="Only ACTIVE members can stay on the dashboard. If another stage is current, we’ll route you there automatically."
            />
        );
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
            router.replace('/login');
            router.refresh();
            setIsSigningOut(false);
        }
    };

    return (
        <FlowPageShell maxWidth="max-w-5xl">
            <FlowPagePanel>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <ActiveSurfaceIntro
                        title="Control Center"
                        description="Your ACTIVE access is ready. Start with the action you need now, then use the reference detail only when you need to verify status or policy."
                        meta={(
                            <>
                                <ActiveStatusChip tone="success">
                                    Admission <span className="ml-1 font-mono text-[10px]">{admissionStatus}</span>
                                </ActiveStatusChip>
                                <ActiveStatusChip tone="info">
                                    Trust <span data-testid="trust-level-badge" className="ml-1 font-mono text-[10px]">{trustLevel}</span>
                                </ActiveStatusChip>
                                <ActiveStatusChip tone={sbtStatus === ADMISSION_STAGES.ACTIVE ? 'success' : 'warning'}>
                                    SOUL <span data-testid="sbt-status-badge" className="ml-1 font-mono text-[10px]">{sbtStatus}</span>
                                </ActiveStatusChip>
                                <ActiveStatusChip tone={soulIssued ? 'success' : 'warning'}>
                                    Credential <span className="ml-1 font-mono text-[10px]">{soulIssued ? 'ISSUED' : 'PENDING'}</span>
                                </ActiveStatusChip>
                            </>
                        )}
                        note="Original source documents are purged after the final decision. Minimal claims, credential status, and audit trace remain available for verification."
                    />

                    <div className="w-full sm:w-32">
                        <SecondaryButton onClick={handleLogout} disabled={isSigningOut}>
                            {isSigningOut ? 'Signing out...' : 'Sign out'}
                        </SecondaryButton>
                    </div>
                </div>

                <FlowInfoGrid className="mt-6">
                    <FlowInfoCard
                        title="Start here"
                        description="Open matches, continue a conversation, or record a trust attestation depending on what needs your attention right now."
                    />
                    <FlowInfoCard
                        title="What stays verified"
                        description="This home keeps the durable account signals visible without leading with policy or low-level processing detail."
                    />
                </FlowInfoGrid>
            </FlowPagePanel>

            <section className="grid gap-6 md:grid-cols-2">
                <FlowPagePanel>
                    <h2 className="liquid-title text-[22px] font-semibold">Your next actions</h2>
                    <p className="liquid-copy mt-2 text-[14px]">
                        These are the ACTIVE surfaces currently available to you. Start with the task you need now and return here when you need the broader trust summary.
                    </p>

                    <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-[#e5e5e7] bg-white p-4">
                            <p className="font-semibold text-slate-900">Connections and conversation</p>
                            <p className="mt-1 text-[13px] text-slate-600">Review curated matches or continue an existing conversation.</p>
                            <PageActionRow className="mt-3">
                                <Link href="/match" className="liquid-btn liquid-btn-primary">Open matches</Link>
                                <Link href="/chat" className="liquid-btn liquid-btn-secondary">Open chat</Link>
                            </PageActionRow>
                        </div>

                        <div className="rounded-2xl border border-[#e5e5e7] bg-white p-4">
                            <p className="font-semibold text-slate-900">Trust actions</p>
                            <p className="mt-1 text-[13px] text-slate-600">Submit an attestation, report a trust event, or revoke participation controls.</p>
                            <PageActionRow className="mt-3">
                                <Link href="/review" className="liquid-btn liquid-btn-primary">Open attestation</Link>
                                <Link href="/report" className="liquid-btn liquid-btn-secondary">Open report</Link>
                                <Link href="/revoke" className="liquid-btn liquid-btn-secondary">Open revoke</Link>
                            </PageActionRow>
                        </div>
                    </div>
                </FlowPagePanel>

                <FlowPagePanel>
                    <h2 className="liquid-title text-[22px] font-semibold">Reference detail</h2>
                    <p className="liquid-copy mt-2 text-[14px]">
                        Keep the main action surface clean, but make the durable account and retention state easy to verify when needed.
                    </p>

                    <FlowInfoGrid className="mt-5">
                        <ReferenceDetailsCard
                            title="Account status"
                            rows={[
                                { label: 'Admission status', value: admissionStatus },
                                { label: 'Trust level', value: trustLevel },
                                { label: 'SBT status', value: sbtStatus },
                                { label: 'Credential', value: soulIssued ? 'ISSUED' : 'PENDING' },
                                { label: 'Issued at', value: soulIssuedAt || 'Not available' },
                            ]}
                            className="h-full"
                        />
                        <FlowInset title="Retention posture" className="h-full">
                            Original source documents are not retained after the final decision. What remains is the minimal claim set needed for trust operations and auditability.
                        </FlowInset>
                    </FlowInfoGrid>
                </FlowPagePanel>
            </section>

            <FlowPagePanel>
                <h2 className="liquid-title text-[22px] font-semibold">Document verification reference</h2>
                <p className="liquid-copy mt-2 text-[14px]">
                    This detail is secondary to the ACTIVE actions above. Use it when you need to confirm how document verification resolved after admission.
                </p>

                {requiredDocuments.length === 0 ? (
                    <FlowInset title="No document detail available" className="mt-5">
                        We do not currently have document reference detail to show for this account.
                    </FlowInset>
                ) : (
                    <FlowInfoGrid className="mt-5 md:grid-cols-2">
                        {requiredDocuments.map((doc, index) => (
                            <ReferenceDetailsCard
                                key={`${doc.type || 'document'}-${index}`}
                                title={doc.type || 'Document'}
                                rows={[
                                    { label: 'Status', value: doc.status || 'UNKNOWN' },
                                    { label: 'Processing', value: doc.processing_status || 'PENDING' },
                                    { label: 'Confidence', value: typeof doc.ai_confidence === 'number' ? doc.ai_confidence.toFixed(2) : 'N/A' },
                                    { label: 'Purged at', value: doc.purged_at || 'NOT_PURGED' },
                                ]}
                            />
                        ))}
                    </FlowInfoGrid>
                )}
            </FlowPagePanel>
        </FlowPageShell>
    );
}
