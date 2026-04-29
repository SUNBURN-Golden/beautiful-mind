import { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, Activity, LogOut, FileCheck2, Gauge, FlaskConical, Shield, Siren, Coins } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="liquid-shell flex min-h-screen flex-col text-[#1d1d1f] md:flex-row">
            <aside className="border-b border-[#e5e5e7] bg-white/95 md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
                <div className="border-b border-[#e5e5e7] px-4 py-5 md:px-6 md:py-7">
                    <h2 className="flex items-center gap-2 text-[21px] font-semibold tracking-tight">
                        <ShieldCheck className="h-6 w-6 text-[#06c]" />
                        Admission Ops
                    </h2>
                    <p className="mt-2 truncate text-xs text-[#6e6e73]">{user.email}</p>
                </div>

                <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:block md:space-y-2 md:overflow-visible md:px-4 md:py-5">
                    <Link
                        href="/admin"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Activity className="h-4 w-4" />
                        Ops Home
                    </Link>
                    <Link
                        href="/admin/users"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Users className="h-4 w-4" />
                        Trust Accounts
                    </Link>
                    <Link
                        href="/admin/admissions"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <FileCheck2 className="h-4 w-4" />
                        Cold-Path Queue
                    </Link>
                    <Link
                        href="/admin/admissions/ops"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Gauge className="h-4 w-4" />
                        Ops Metrics
                    </Link>
                    <Link
                        href="/admin/admissions/policy"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <FlaskConical className="h-4 w-4" />
                        Policy Proposals
                    </Link>
                    <Link
                        href="/admin/audits"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Shield className="h-4 w-4" />
                        Audits
                    </Link>
                    <Link
                        href="/admin/enforcement"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Siren className="h-4 w-4" />
                        Enforcement
                    </Link>
                    <Link
                        href="/admin/treasury"
                        className="inline-flex h-11 min-w-fit items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] font-medium text-[#3a3a3c] transition-colors hover:bg-[#f5f5f7] md:flex"
                    >
                        <Coins className="h-4 w-4" />
                        Treasury
                    </Link>
                </nav>

                <div className="border-t border-[#e5e5e7] p-3 md:p-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-sm font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                    >
                        <LogOut className="h-4 w-4" />
                        Exit to Trust Home
                    </Link>
                </div>
            </aside>

            <main className="flex-1">
                <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-8 md:pt-10">{children}</div>
            </main>
        </div>
    );
}
