import { Suspense } from 'react';
import ChatClient from './ChatClient';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73]">채팅방을 불러오는 중...</div>}>
            <ChatClient />
        </Suspense>
    );
}
