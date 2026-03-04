'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function ChatRoomPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const partnerName = searchParams?.get('partnerName') || '상대방';

    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [isMet, setIsMet] = useState(false);

    useEffect(() => {
        // 채팅방 진입 시 초기 메시지
        setMessages([
            { sender: partnerName, text: '안녕하세요! 매칭되어서 반갑습니다.' },
        ]);
    }, [partnerName]);

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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md h-[600px] flex flex-col">
                <CardHeader className="border-b">
                    <CardTitle className="flex justify-between items-center text-lg">
                        <span>🗨️ {partnerName}</span>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/match')}>
                            나가기
                        </Button>
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="text-center text-xs text-gray-400 my-4">
                        모든 대화 내용은 암호화되며 관리자는 열람할 수 없습니다. (더미 UI)
                    </div>

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex flex-col ${msg.sender === 'System' ? 'items-center mt-6 mb-2' : 'items-start'}`}
                        >
                            {msg.sender === 'System' ? (
                                <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">{msg.text}</span>
                            ) : (
                                <div className="bg-white border rounded-lg p-3 max-w-[80%]">
                                    <span className="text-xs text-gray-500 font-bold block mb-1">{msg.sender}</span>
                                    <span className="text-sm">{msg.text}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>

                <CardFooter className="border-t p-4 flex flex-col gap-2 bg-gray-100 rounded-b-lg">
                    <div className="text-sm text-gray-500 text-center w-full mb-2">
                        실제로 현장에서 만났다면 상호 동의 버튼을 눌러 확정해주세요.
                    </div>
                    <div className="flex w-full gap-2">
                        <Button
                            variant="outline"
                            className="w-1/2 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                            onClick={() => router.push('/report')}
                        >
                            차단 및 신고
                        </Button>
                        <Button
                            className="w-1/2 bg-blue-600 hover:bg-blue-700"
                            disabled={isMet}
                            onClick={handleCompleteMeet}
                        >
                            {isMet ? '확정 처리 완료' : '만남 확정 (양측 동의)'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
