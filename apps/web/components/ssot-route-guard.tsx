'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStatus } from '@/lib/useStatus';
import { resolveGuardRedirect } from '@/lib/stageRoutes';
import { getStatusStage } from '@/lib/contracts/status-contract';

export default function SsotRouteGuard() {
    const { status, isLoading } = useStatus();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isLoading || !status) {
            return;
        }

        if (typeof status.error === 'string' && status.error.length > 0) {
            return;
        }

        const isFrozen = status?.meta?.is_frozen === true;
        const stage = getStatusStage(status);
        const redirectTo = resolveGuardRedirect({
            pathname,
            stage,
            isFrozen,
        });
        if (redirectTo) {
            router.replace(redirectTo);
        }
    }, [isLoading, pathname, router, status]);

    return null;
}
