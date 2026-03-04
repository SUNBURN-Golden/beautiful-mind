import SsotRouteGuard from '@/components/ssot-route-guard';

// Force dynamic execution for SSOT accuracy
export const dynamic = 'force-dynamic';

export default async function GuardedLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="liquid-shell min-h-screen text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
            <SsotRouteGuard />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
