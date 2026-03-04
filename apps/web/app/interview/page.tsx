'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function InterviewPage() {
    const router = useRouter();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleStartInterview = async () => {
        setIsEvaluating(true);
        try {
            const response = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewContext: {
                        osintRiskScore: 5,
                        socialMediaActivity: "안전함. 위험 키워드 없음.",
                        financialRecord: "체납 이력 없음. 신용 상태 양호.",
                        userProfileBio: "건강하고 신뢰할 수 있는 만남을 추구합니다."
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                alert(`API Error: ${err.error || response.statusText}`);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setResult(data.result);
            } else {
                alert('결과를 파싱할 수 없습니다.');
            }
        } catch (error) {
            console.error('Interview Request Error:', error);
            alert('서버 요청 중 오류가 발생했습니다.');
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">AI 인터뷰</CardTitle>
                    <CardDescription className="text-center">신뢰도 검증을 위한 챗봇 인터뷰 결과</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {!result && !isEvaluating && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-6">AI가 당신의 기록을 바탕으로 최종 승인 심사를 진행합니다.</p>
                            <Button onClick={handleStartInterview} className="w-full bg-blue-600 hover:bg-blue-700">
                                인터뷰 시작 (Mock)
                            </Button>
                        </div>
                    )}

                    {isEvaluating && !result && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
                            <p className="text-sm text-gray-500 font-mono">Gemini 2.5 Evaluating Context...</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="bg-gray-900 border border-gray-800 rounded p-4 text-center">
                                <p className="text-sm font-semibold text-gray-400">최종 심사 결과 (Decision)</p>
                                <p className="text-3xl font-bold text-white mt-2 tracking-widest">{result.decision}</p>
                            </div>
                            <ul className="text-sm space-y-2 text-gray-600 bg-white border rounded p-4">
                                <li className="flex justify-between">
                                    <span>추가 신뢰 점수</span>
                                    <span className="font-semibold text-blue-600">{result.score} 점</span>
                                </li>
                                {result.risk_flags && result.risk_flags.length > 0 && (
                                    <li className="flex justify-between text-red-600 mt-2">
                                        <span>위험 징후</span>
                                        <span className="font-semibold">{result.risk_flags.join(', ')}</span>
                                    </li>
                                )}
                                <li className="flex flex-col mt-2 border-t pt-2">
                                    <span className="text-gray-500 mb-1">AI 평가 요약:</span>
                                    <span className="font-medium text-gray-800 leading-relaxed">{result.summary}</span>
                                </li>
                            </ul>
                        </div>
                    )}

                </CardContent>
                {result && (
                    <CardFooter>
                        <Button className="w-full" onClick={() => router.push('/match')}>
                            매칭 리스트 열기
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
