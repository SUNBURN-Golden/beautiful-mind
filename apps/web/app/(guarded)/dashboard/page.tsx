'use client';

import { useStatus } from '@/lib/useStatus';
import { Skeleton, SupportCTA, SecondaryButton, AuditLogRow } from '@/components/ui-kit';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const { status, isLoading } = useStatus();
    const router = useRouter();

    if (isLoading || status?.step !== 'DASHBOARD_READY') {
        return <main className="max-w-4xl mx-auto pt-24 px-6"><Skeleton /></main>;
    }

    const receiptId = status.meta?.receipt_id || 'N/A: Loading Receipt ID...';
    const docVersion = status.meta?.doc_version || 'N/A';
    const timeBucket = new Date().toISOString();

    const handleLogout = async () => {
        // Basic signout (TBD actual flow depending on auth setup)
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout`, { method: 'POST' });
        router.push('/login');
    };

    return (
        <main className="max-w-4xl mx-auto pt-16 px-6 pb-12 flex flex-col min-h-screen">
            <div className="flex-1">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-[32px] font-semibold tracking-tight text-[#111111]">Dashboard.</h1>
                    <div className="w-32">
                        <SecondaryButton onClick={handleLogout}>안전 로그아웃</SecondaryButton>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Main Status Card */}
                    <div className="rounded-xl border border-[#E5E5E5] p-8 bg-white shadow-sm flex flex-col">
                        <h2 className="text-[20px] font-semibold text-[#111111] mb-2">온보딩 통합 결과</h2>
                        <p className="text-[14px] text-[#555555] mb-6 border-b border-slate-100 pb-6">
                            모든 심사 단계를 정상적으로 통과하셨습니다.<br />
                            메인 서비스의 모든 기능에 접근 권한이 활성화되었습니다.
                        </p>

                        <div className="mt-auto pt-4 flex items-center justify-between text-[13px] text-[#888888]">
                            <span>Status</span>
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-full">ACTIVE</div>
                        </div>
                    </div>

                    {/* Electronic Receipt / 증적 영수증 Card */}
                    <div className="rounded-xl border border-[#E5E5E5] p-8 bg-[#F9FAFA] flex flex-col shadow-inner">
                        <h2 className="text-[20px] font-semibold text-[#111111] mb-2">통합 서비스 영수증</h2>
                        <p className="text-[13px] text-[#555555] mb-6">등록된 모든 자격 증명과 서명 내역은 감사 로그로 불변 격리 보호됩니다.</p>

                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-[13px] text-[#555555]">원장 Receipt ID</span>
                                <span className="text-[12px] font-mono text-[#111111] truncate max-w-[150px]">{receiptId}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-[13px] text-[#555555]">계약서 버전</span>
                                <span className="text-[13px] font-mono text-[#111111]">{docVersion}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-[13px] text-[#555555]">타임스탬프</span>
                                <span className="text-[13px] font-mono text-[#111111]">{timeBucket}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-200">
                            <h3 className="text-[12px] font-semibold text-[#888888] mb-3 uppercase tracking-wider">최근 감사 로그</h3>
                            <AuditLogRow action="INTERVIEW_FINALIZED" timestamp={timeBucket} hash={receiptId} />
                            <AuditLogRow action="CONTRACT_SIGNATURE" timestamp={timeBucket} hash={receiptId} />
                            <AuditLogRow action="CONSENT_SIGN" timestamp={timeBucket} hash={receiptId} />
                            <AuditLogRow action="ONBOARDING_VERIFICATION" timestamp={timeBucket} hash={receiptId} />
                        </div>
                    </div>
                </div>
            </div>

            <SupportCTA />
        </main>
    );
}
