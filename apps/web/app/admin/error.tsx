'use client';

import { useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui-kit';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Admin route error:', error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <div className="liquid-pane w-full max-w-md rounded-2xl p-8 shadow-xl">
                <h2 className="mb-4 text-xl font-semibold text-red-600">어드민 권한 오류</h2>
                <p className="mb-8 text-sm text-gray-600">
                    요청하신 관리자 페이지를 불러오지 못했습니다. 네트워크 상태나 관리자 권한을 다시 한 번 확인해주세요.
                </p>
                <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => reset()}>다시 시도하기</PrimaryButton>
                    <SecondaryButton onClick={() => window.location.assign('/dashboard')}>대시보드로 돌아가기</SecondaryButton>
                </div>
            </div>
        </div>
    );
}
