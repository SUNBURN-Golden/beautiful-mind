import { Suspense } from 'react';
import ChatClient from './ChatClient';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
    return (
        <Suspense fallback={(
            <main className="mx-auto flex min-h-screen max-w-md px-4 pb-10 pt-20 sm:px-6">
                <div className="liquid-pane liquid-rise flex w-full items-center justify-center rounded-3xl p-6 text-center text-[14px] text-slate-600">
                    Opening secure conversation...
                </div>
            </main>
        )}>
            <ChatClient />
        </Suspense>
    );
}
