'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function ChatClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const partnerName = searchParams?.get('partnerName') || '상대방';

    const [messages, setMessages] = useState<{ sender: string, text: string }[]>(() => [
        { sender: partnerName, text: '안녕하세요! 매칭되어서 반갑습니다.' },
    ]);
    const [isMet, setIsMet] = useState(false);

    const handleCompleteMeet = () => {
        setIsMet(true);
        // 양측 만남 완료 피드백을 가짜로 보여줌
        setMessages(prev => [
            ...prev,
            { sender: 'System', text: '[시스템] 양측이 서로 만남을 확정했습니다.' },
            { sender: 'System', text: '[시스템] 안전 거래 보증 세션이 종료됩니다. 곧 리뷰 평가로 이동합니다.' }
        ]);

        setTimeout(() => {
            router.push('/review');
        }, 2500);
    };

    return (
        <div className="liquid-shell flex min-h-screen flex-col items-center justify-center p-3 sm:p-4">
            <Card className="liquid-pane liquid-rise flex h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col rounded-3xl border-[#e5e5e7] sm:h-[620px]">
                <CardHeader className="border-b border-[#ececf0]">
                    <CardTitle className="flex items-center justify-between text-[18px] font-semibold text-[#1d1d1f]">
                        <span>{partnerName}</span>
                        <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => router.push('/match')}>
                            목록으로
                        </Button>
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
                    <div className="my-4 text-center text-xs text-[#8e8e93]">
                        모든 대화 내용은 암호화되며 관리자 열람이 제한됩니다.
                    </div>

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'System' ? 'mb-2 mt-6 items-center' : 'items-start'}`}>
                            {msg.sender === 'System' ? (
                                <span className="liquid-chip rounded-full px-3 py-1 text-xs text-[#6e6e73]">{msg.text}</span>
                            ) : (
                                <div className="max-w-[85%] rounded-2xl border border-[#e5e5e7] bg-white p-3 sm:max-w-[80%]">
                                    <span className="mb-1 block text-xs font-semibold text-[#6e6e73]">{msg.sender}</span>
                                    <span className="text-sm text-[#1d1d1f]">{msg.text}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>

                <CardFooter className="flex flex-col gap-2 rounded-b-3xl border-t border-[#ececf0] bg-[#fbfbfd] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                    <div className="mb-2 w-full text-center text-sm text-[#6e6e73]">
                        오프라인 만남이 확인되면 상호 동의로 종료하세요.
                    </div>
                    <div className="flex w-full gap-2">
                        <Button
                            variant="outline"
                            className="h-12 w-1/2 border-[#f3d1d1] bg-[#fff5f5] text-[#b42318] hover:bg-[#ffeaea]"
                            onClick={() => router.push('/report')}
                        >
                            신고
                        </Button>
                        <Button className="h-12 w-1/2" disabled={isMet} onClick={handleCompleteMeet}>
                            {isMet ? '처리 완료' : '만남 확정'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
