'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Skeleton, SupportCTA, SecondaryButton, AuditLogRow, StageTransitionNotice } from '@/components/ui-kit';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DashboardPage() {
    const { status, isLoading } = useStatus();
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-5xl px-6 pb-12 pt-24">
                <div className="liquid-pane rounded-3xl p-6">
                    <Skeleton lines={4} />
                </div>
            </main>
        );
    }

    if (status?.step !== 'DASHBOARD_READY') {
        return (
            <StageTransitionNotice
                currentStep={status?.step}
                title="대시보드 준비 중입니다."
                description="심사/온보딩 상태를 확인한 뒤 접근 가능한 화면으로 연결합니다."
            />
        );
    }

    const meta = status.meta;
    const receiptId = typeof meta?.receipt_id === 'string' ? meta.receipt_id : 'N/A';
    const docVersion = typeof meta?.doc_version === 'string'
        ? meta.doc_version
        : `SSOT-v${typeof meta?.schema_version === 'number' ? meta.schema_version : 1}`;
    const latestContractId = typeof meta?.latest_contract_id === 'string' ? meta.latest_contract_id : null;
    const latestInterviewId = typeof meta?.latest_interview_id === 'string' ? meta.latest_interview_id : null;
    const latestContractAt = typeof meta?.latest_contract_at === 'string' ? meta.latest_contract_at : null;
    const latestInterviewAt = typeof meta?.latest_interview_at === 'string' ? meta.latest_interview_at : null;
    const latestDecision = typeof meta?.latest_interview_decision === 'string' ? meta.latest_interview_decision : null;
    const latestScore = typeof meta?.latest_interview_score === 'number' ? meta.latest_interview_score : null;
    const timeBucket = latestInterviewAt || latestContractAt || (typeof meta?.server_time === 'string' ? meta.server_time : new Date().toISOString());
    const trustLevel = typeof meta?.trust_level === 'string' ? meta.trust_level : 'UNSET';
    const sbtStatus = typeof meta?.sbt_status === 'string' ? meta.sbt_status : 'NONE';
    const auditInProgress = meta?.audit_in_progress === true;
    const selfDevConfidence = typeof meta?.self_dev_confidence === 'number' ? meta.self_dev_confidence : null;
    const selfDevActionPlan = Array.isArray(meta?.self_dev_action_plan)
        ? meta.self_dev_action_plan
            .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : null))
            .filter((item): item is Record<string, unknown> => item !== null)
            .map((item) => ({
                title: typeof item.title === 'string' ? item.title : 'Action',
                priority: typeof item.priority === 'string' ? item.priority : 'P2',
                metric: typeof item.metric === 'string' ? item.metric : 'N/A',
                target: typeof item.target === 'string' ? item.target : 'N/A',
            }))
            .slice(0, 3)
        : [];
    const auditLogRows = [
        latestContractAt ? { action: 'CONTRACT_SIGNATURE', timestamp: latestContractAt, hash: latestContractId || receiptId } : null,
        latestInterviewAt ? { action: `INTERVIEW_${latestDecision || 'DONE'}`, timestamp: latestInterviewAt, hash: latestInterviewId || receiptId } : null,
        typeof meta?.sbt_issued_at === 'string' ? { action: 'SBT_STATUS_UPDATE', timestamp: meta.sbt_issued_at, hash: receiptId } : null,
    ].filter((row): row is { action: string; timestamp: string; hash: string } => row !== null);

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
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="flex-1">
                <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="liquid-title text-[30px] font-semibold sm:text-[34px]">Dashboard.</h1>
                    <div className="w-full sm:w-32">
                        <SecondaryButton onClick={handleLogout} disabled={isSigningOut}>
                            {isSigningOut ? '로그아웃 중...' : '안전 로그아웃'}
                        </SecondaryButton>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                    {/* Main Status Card */}
                    <div className="liquid-pane liquid-rise flex flex-col rounded-3xl p-6 sm:p-8">
                        <h2 className="liquid-title mb-2 text-[22px] font-semibold">온보딩 통합 결과</h2>
                        <p className="liquid-copy mb-6 border-b pb-6 text-[14px] liquid-divider">
                            모든 심사 단계를 정상적으로 통과하셨습니다.<br />
                            메인 서비스의 모든 기능에 접근 권한이 활성화되었습니다.
                        </p>

                        <div className="mb-6 space-y-3">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-600">SBT 신뢰 레벨</span>
                                <span data-testid="trust-level-badge" className="liquid-chip rounded-full px-3 py-1 font-semibold text-slate-800">{trustLevel}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-600">SBT 상태</span>
                                <span data-testid="sbt-status-badge" className="liquid-chip rounded-full px-3 py-1 font-semibold text-slate-800">{sbtStatus}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-600">감사 진행 상태</span>
                                <span data-testid="audit-progress-badge" className="liquid-chip rounded-full px-3 py-1 font-semibold text-slate-800">
                                    {auditInProgress ? 'UNDER_REVIEW' : 'NONE'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-600">Behavioral 신뢰도</span>
                                <span className="liquid-chip rounded-full px-3 py-1 font-semibold text-slate-800">
                                    {selfDevConfidence !== null ? selfDevConfidence.toFixed(2) : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {selfDevActionPlan.length > 0 && (
                            <div className="mb-4 border-t pt-4 liquid-divider">
                                <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Self Development Loop</h3>
                                <div className="space-y-2">
                                    {selfDevActionPlan.map((action, idx) => (
                                        <div key={`self-dev-action-${idx}`} className="rounded-xl border px-3 py-2 liquid-divider">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="text-[12px] font-semibold text-slate-700">{action.title}</span>
                                                <span className="liquid-chip rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-700">{action.priority}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                                <span>{action.metric}</span>
                                                <span>{action.target}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-4 text-[13px] text-slate-500">
                            <span>Status</span>
                            <div className="liquid-chip rounded-full px-3 py-1 font-medium text-emerald-700">ACTIVE</div>
                        </div>
                    </div>

                    {/* Electronic Receipt / 증적 영수증 Card */}
                    <div className="liquid-pane-muted liquid-rise flex flex-col rounded-3xl p-6 sm:p-8">
                        <h2 className="liquid-title mb-2 text-[22px] font-semibold">통합 서비스 영수증</h2>
                        <p className="liquid-copy mb-6 text-[13px]">등록된 모든 자격 증명과 서명 내역은 감사 로그로 불변 격리 보호됩니다.</p>

                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between border-b pb-2 liquid-divider">
                                <span className="text-[13px] text-slate-600">원장 Receipt ID</span>
                                <span className="max-w-[160px] truncate text-[12px] font-mono text-slate-900">{receiptId}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2 liquid-divider">
                                <span className="text-[13px] text-slate-600">계약서 버전</span>
                                <span className="text-[13px] font-mono text-slate-900">{docVersion}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2 liquid-divider">
                                <span className="text-[13px] text-slate-600">타임스탬프</span>
                                <span className="text-[13px] font-mono text-slate-900">{timeBucket}</span>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-4 liquid-divider">
                            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">최근 감사 로그</h3>
                            {auditLogRows.length > 0 ? (
                                auditLogRows.map((row, idx) => (
                                    <AuditLogRow key={`audit-log-${idx}`} action={row.action} timestamp={row.timestamp} hash={row.hash} />
                                ))
                            ) : (
                                <AuditLogRow action="NO_RECENT_AUDIT_LOG" timestamp={timeBucket} hash={receiptId} />
                            )}
                            {latestScore !== null && (
                                <p className="mt-3 text-[12px] text-slate-600">최근 인터뷰 점수: {latestScore}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <SupportCTA />
        </main>
    );
}
