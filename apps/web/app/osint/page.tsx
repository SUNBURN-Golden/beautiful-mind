'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type OsintReportData = {
    trustScore: number;
    socialFootprint: string;
    riskFlags: string;
    lastVerified: string;
};

export default function OsintPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<OsintReportData | null>(null);

    const handleGenerateReport = () => {
        setIsGenerating(true);
        // Mock API delay
        setTimeout(() => {
            setReportData({
                trustScore: 95,
                socialFootprint: 'Clean',
                riskFlags: 'None',
                lastVerified: new Date().toLocaleDateString()
            });
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-pane liquid-rise w-full max-w-md rounded-3xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-[28px] font-semibold tracking-tight">OSINT 신뢰 분석</CardTitle>
                    <CardDescription className="text-center">공개 데이터를 기반으로 평판 지표를 계산합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!reportData && !isGenerating && (
                        <div className="py-8 text-center">
                            <p className="mb-6 text-[#6e6e73]">아직 생성된 리포트가 없습니다.</p>
                            <Button onClick={handleGenerateReport} className="h-12 w-full">
                                OSINT 리포트 생성
                            </Button>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-[#8e8e93]" />
                            <p className="text-sm text-[#6e6e73]">데이터 수집 및 분석 중...</p>
                        </div>
                    )}

                    {reportData && (
                        <div className="animate-in fade-in zoom-in space-y-4 duration-300">
                            <div className="liquid-pane rounded-2xl p-4 text-center">
                                <p className="text-sm font-semibold text-[#6e6e73]">종합 신뢰도 점수</p>
                                <p className="mt-2 text-4xl font-semibold text-[#1d1d1f]">{reportData.trustScore} 점</p>
                            </div>
                            <ul className="liquid-pane-muted space-y-2 rounded-2xl p-4 text-sm text-[#3a3a3c]">
                                <li className="flex justify-between">
                                    <span>소셜 발자국</span>
                                    <span className="font-semibold">{reportData.socialFootprint}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>위험 요소</span>
                                    <span className="font-semibold">{reportData.riskFlags}</span>
                                </li>
                                <li className="mt-2 flex justify-between border-t border-[#ececf0] pt-2">
                                    <span>최종 검증일</span>
                                    <span>{reportData.lastVerified}</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </CardContent>
                {reportData && (
                    <CardFooter className="border-t border-[#ececf0] bg-[#fbfbfd]">
                        <Button className="h-12 w-full" onClick={() => router.push('/interview')}>
                            AI 인터뷰로 이동
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
