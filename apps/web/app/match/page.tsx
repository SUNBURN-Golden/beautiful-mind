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
        <div className="liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
            <div className="mx-auto max-w-3xl space-y-7">
                <header className="space-y-2">
                    <h1 className="liquid-title text-[30px] font-semibold tracking-tight sm:text-[34px]">매칭 리스트</h1>
                    <p className="liquid-copy text-[15px]">검증을 통과한 후보를 확인하고 채팅을 시작하세요.</p>
                </header>

                <div className="flex flex-col gap-4">
                    {DUMMY_MATCHES.map((match) => (
                        <Card key={match.id} className="liquid-pane liquid-rise w-full rounded-3xl border-[#e5e5e7]">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-[22px] font-semibold text-[#1d1d1f]">{match.name}</CardTitle>
                                        <CardDescription className="text-[14px]">
                                            신뢰도 티어: <span className="font-semibold text-[#1d1d1f]">{match.score}점</span>
                                        </CardDescription>
                                    </div>
                                    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[12px] font-semibold ${match.score >= 100
                                            ? 'border-[#cde8d4] bg-[#edf9f1] text-[#14532d]'
                                            : 'border-[#f4d6b8] bg-[#fff7ed] text-[#9a3412]'
                                        }`}>
                                        {match.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {match.tags.map((tag) => (
                                        <span key={tag} className="liquid-chip rounded-full px-2.5 py-1 text-[12px] text-[#6e6e73]">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="rounded-b-3xl border-t border-[#ececf0] bg-[#fbfbfd] pt-4">
                                <Button className="h-12 w-full" onClick={() => handleChat(match.id, match.name)}>
                                    채팅 시작
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
