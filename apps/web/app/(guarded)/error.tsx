'use client';

import { useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui-kit';

type ErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GuardedError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Guarded route error:', error);
    }, [error]);

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 sm:px-6">
            <div className="liquid-pane rounded-3xl p-6 sm:p-8">
                <h1 className="liquid-title text-[24px] font-semibold">화면을 불러오지 못했습니다.</h1>
                <p className="liquid-copy mt-3 text-[14px]">
                    네트워크 상태를 확인한 뒤 다시 시도해 주세요. 문제가 반복되면 새로고침 후 재로그인해 주세요.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <PrimaryButton type="button" onClick={reset}>
                        다시 시도
                    </PrimaryButton>
                    <SecondaryButton type="button" onClick={() => window.location.assign('/login')}>
                        로그인 화면으로 이동
                    </SecondaryButton>
                </div>
            </div>
        </main>
    );
}
