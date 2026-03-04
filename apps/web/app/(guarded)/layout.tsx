import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getExpectedRoute } from '../../lib/stageRoutes';
import { StatusContract } from '../../lib/types/status';

// Force dynamic execution for SSOT accuracy
export const dynamic = 'force-dynamic';

export default async function GuardedLayout({ children }: { children: React.ReactNode }) {
    // Server-side redirect is securely handled in middleware.ts
    // Client-side route enforcement is securely handled by useStatus.ts hooks
    // Fetching absolute URL HTTP endpoints inside Server Components with raw headers is an anti-pattern and often fails.

    return (
        <div className="min-h-screen bg-[#F9FAFA] text-[#111111] font-sans antialiased selection:bg-[#0F172A] selection:text-white">
            {/* 
        We rely on the client-side RouteGuard (via useStatus hook) to enforce the exact pathname match,
        as Next.js App Router layouts do not inherently know their exact URL pathname server-side without middleware.
      */}
            {children}
        </div>
    );
}
