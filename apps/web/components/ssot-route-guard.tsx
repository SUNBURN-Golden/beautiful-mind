'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStatus } from '@/lib/useStatus';
import { getExpectedRoute, STAGE_ROUTES, Stage } from '@/lib/stageRoutes';

function isStage(value: string): value is Stage {
    return Object.prototype.hasOwnProperty.call(STAGE_ROUTES, value);
}

export default function SsotRouteGuard() {
    const { status, isLoading } = useStatus();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isLoading || !status) {
            return;
        }

        const isFrozen = status?.meta?.is_frozen === true;
        if (isFrozen && pathname !== '/banned') {
            router.replace('/banned');
            return;
        }

        if (!isFrozen && pathname === '/banned') {
            const currentStep = typeof status.step === 'string' ? status.step : '';
            if (isStage(currentStep)) {
                router.replace(getExpectedRoute(currentStep));
            } else {
                router.replace('/dashboard');
            }
            return;
        }

        const currentStep = typeof status.step === 'string' ? status.step : '';
        if (pathname === '/banned' || !isStage(currentStep)) {
            return;
        }

        const expected = getExpectedRoute(currentStep);
        if (pathname !== expected) {
            router.replace(expected);
        }
    }, [isLoading, pathname, router, status]);

    return null;
}
