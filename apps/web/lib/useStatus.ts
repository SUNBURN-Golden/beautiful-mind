'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getExpectedRoute, PUBLIC_ROUTES } from './stageRoutes';
import { StatusContract } from './types/status';

export interface UseStatusResult {
    status: StatusContract | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    handleActionError: (errorCode: string) => void;
}

export function useStatus(): UseStatusResult {
    const router = useRouter();
    const pathname = usePathname();

    const [status, setStatus] = useState<StatusContract | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async (currentPathname: string, currentRouter: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/me/status', { cache: 'no-store' });

            if (res.status === 401 || res.status === 403) {
                if (!PUBLIC_ROUTES.includes(currentPathname)) {
                    currentRouter.replace('/login');
                }
                return;
            }

            if (!res.ok) throw new Error('Failed to fetch status');

            const data: StatusContract = await res.json();
            setStatus(data);

            if (data.error_code === 'BANNED' && currentPathname !== '/banned') {
                currentRouter.replace('/banned');
                return;
            }

            // SSOT Strict Guard: Enforce the route based exactly on the 'step'
            const expectedRoute = getExpectedRoute(data.step);

            // Only redirect if we are not explicitly already on the correct page
            if (currentPathname !== expectedRoute && !PUBLIC_ROUTES.includes(currentPathname)) {
                currentRouter.replace(expectedRoute);
            } else if (currentPathname === '/login' && data.step !== 'LOGIN') {
                // Auto-resume from login if already authenticated
                currentRouter.replace(expectedRoute);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus(pathname, router);
    }, [fetchStatus, pathname, router]);

    const handleActionError = useCallback((errorCode: string) => {
        switch (errorCode) {
            case 'AUTH_REQUIRED':
            case 'QUALIFICATION_REQUIRED':
            case 'CONSENT_REQUIRED':
                // Safe recovery: refetch status to hit the Guard redirect
                fetchStatus(pathname, router);
                break;
            case 'BANNED':
                fetchStatus(pathname, router); // fetchStatus will see BANNED and redirect
                break;
            case 'VERSION_MISMATCH':
                // Specifically for E_SIGN reload constraint
                alert('문서의 버전이 업데이트되었습니다. 내용을 다시 확인해주세요.');
                window.location.reload();
                break;
            case 'KYC_FAILED':
            case 'PORTONE_ERROR':
                alert('인증 기관 응답이 지연되거나 정보가 일치하지 않습니다. 다시 시도해주세요.');
                break;
            default:
                alert('서버와의 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.');
                break;
        }
    }, [fetchStatus]);

    return { status, isLoading, error, refetch: () => fetchStatus(pathname, router), handleActionError };
}
