import SsotRouteGuard from '@/components/ssot-route-guard';
import { GuardedShell } from '@/components/shell/guarded-shell';
import { Suspense, type ReactNode } from 'react';

// Force dynamic execution for SSOT accuracy
export const dynamic = 'force-dynamic';

export default async function GuardedLayout({ children }: { children: ReactNode }) {
    return (
        <div className="liquid-shell min-h-screen text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
            <SsotRouteGuard />
            <Suspense fallback={<div className="relative z-10">{children}</div>}>
                <GuardedShell>{children}</GuardedShell>
            </Suspense>
        </div>
    );
}
