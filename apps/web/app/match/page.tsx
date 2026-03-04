'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const DUMMY_MATCHES = [
    { id: '1', name: '신뢰자2 (Mock)', score: 110, status: '안전 대상', tags: ['IT직군', '빠른답장'] },
    { id: '2', name: '신뢰자3 (Mock)', score: 98, status: '주의 요망 (신고 1건)', tags: ['보류'] },
];

export default function MatchListPage() {
    const router = useRouter();

    const handleChat = (id: string, name: string) => {
        // 채팅방 페이지로 파라미터 전달 (시뮬레이션)
        router.push(`/chat?partnerId=${id}&partnerName=${encodeURIComponent(name)}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">당신의 매칭 리스트</h1>
                    <p className="text-gray-500 mt-2">안전 검증을 통과한 신뢰도 높은 회원들입니다.</p>
                </div>

                <div className="flex flex-col gap-4">
                    {DUMMY_MATCHES.map((match) => (
                        <Card key={match.id} className="w-full transition-shadow hover:shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl">{match.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            신뢰도 티어: <span className="font-bold text-black">{match.score}점</span>
                                        </CardDescription>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded border font-semibold ${match.score >= 100
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                        {match.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 mt-2">
                                    {match.tags.map(tag => (
                                        <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">#{tag}</span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50 pt-4 rounded-b-lg">
                                <Button
                                    className="w-full"
                                    onClick={() => handleChat(match.id, match.name)}
                                >
                                    채팅하기
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
