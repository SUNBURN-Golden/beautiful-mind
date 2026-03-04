'use client';

import { useState } from 'react';
import { banUser } from '@/app/actions/admin';
import { Ban } from 'lucide-react';

export default function BanButton({ userId }: { userId: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleBan = async () => {
        setIsPending(true);
        const reason = "Violation of Terms (Automated Ban)";

        const res = await banUser(userId, reason);

        if (res.error) {
            alert('Failed to ban user: ' + res.error);
        } else {
            alert('User successfully banned.');
        }

        setIsPending(false);
    };

    return (
        <button
            onClick={handleBan}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 gap-2"
        >
            <Ban className="w-4 h-4" />
            {isPending ? 'Banning...' : '강제 차단 (Ban)'}
        </button>
    );
}
