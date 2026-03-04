'use client';

import { useState } from 'react';
import { banUser } from '@/app/actions/admin';
import { Ban } from 'lucide-react';

export default function BanButton({ userId }: { userId: string }) {
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

    const handleBan = async () => {
        const confirmed = window.confirm('정말로 이 사용자를 강제 차단하시겠습니까?');
        if (!confirmed) return;

        setIsPending(true);
        setMessage(null);
        const reason = "Violation of Terms (Automated Ban)";
        try {
            const res = await banUser(userId, reason);
            if (res.error) {
                setMessage({ text: `차단 실패: ${res.error}`, tone: 'error' });
            } else {
                setMessage({ text: '사용자 차단이 완료되었습니다.', tone: 'success' });
                window.setTimeout(() => window.location.reload(), 700);
            }
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="w-full sm:w-auto">
            <button
                onClick={handleBan}
                disabled={isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium text-[#b42318] transition-colors hover:bg-[#fff5f5] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
            >
                <Ban className="h-4 w-4" />
                {isPending ? '차단 처리 중...' : '강제 차단'}
            </button>
            {message && (
                <p
                    className={`mt-2 text-xs ${message.tone === 'success' ? 'text-[#14532d]' : 'text-[#b42318]'}`}
                    role="status"
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
