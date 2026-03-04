'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function OsintPage() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">OSINT 신뢰도 분석</CardTitle>
                    <CardDescription className="text-center">공개된 데이터를 바탕으로 고객님의 평판을 분석합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {!reportData && !isGenerating && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-6">아직 생성된 리포트가 없습니다.</p>
                            <Button onClick={handleGenerateReport} className="w-full">
                                OSINT 리포트 생성 시작
                            </Button>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                            <p className="text-sm text-gray-500">데이터 수집 및 분석 중...</p>
                        </div>
                    )}

                    {reportData && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                                <p className="text-sm font-semibold text-green-800">종합 신뢰도 점수 (Trust Score)</p>
                                <p className="text-4xl font-bold text-green-600 mt-2">{reportData.trustScore} 점</p>
                            </div>
                            <ul className="text-sm space-y-2 text-gray-600 bg-white border rounded p-4">
                                <li className="flex justify-between">
                                    <span>소셜 발자국 (Social Footprint)</span>
                                    <span className="font-semibold">{reportData.socialFootprint}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>위험 요소 (Risk Flags)</span>
                                    <span className="font-semibold">{reportData.riskFlags}</span>
                                </li>
                                <li className="flex justify-between border-t pt-2 mt-2">
                                    <span>최종 검증일</span>
                                    <span>{reportData.lastVerified}</span>
                                </li>
                            </ul>
                        </div>
                    )}

                </CardContent>
                {reportData && (
                    <CardFooter>
                        <Button className="w-full" onClick={() => router.push('/interview')}>
                            결과 확인 및 AI 인터뷰로 이동
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
