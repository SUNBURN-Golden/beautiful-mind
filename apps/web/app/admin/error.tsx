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
                <h2 className="mb-4 text-xl font-semibold text-red-600">We couldn't load the admin workspace</h2>
                <p className="mb-8 text-sm text-gray-600">
                    Check your network connection and admin access, then try again.
                </p>
                <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => reset()}>Try again</PrimaryButton>
                    <SecondaryButton onClick={() => window.location.assign('/dashboard')}>Return to dashboard</SecondaryButton>
                </div>
            </div>
        </div>
    );
}
