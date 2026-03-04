'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function ReportPage() {
    const router = useRouter();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md border-red-200">
                <CardHeader className="bg-red-50 text-red-900 rounded-t-lg border-b border-red-100">
                    <CardTitle className="text-2xl text-center">악성 유저 신고</CardTitle>
                    <CardDescription className="text-center text-red-700 mt-1">
                        허위 신고 시 본인에게 강력한 역패널티가 부여됩니다. 신중하게 작성해주세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">

                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="target">신고 대상 닉네임</Label>
                                <Input id="target" defaultValue="신뢰자3 (Mock)" disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason">신고 사유</Label>
                                <Input id="reason" placeholder="구체적인 사유를 입력하세요" required />
                            </div>
                            <div className="text-xs text-justify text-gray-500 bg-gray-100 p-3 rounded leading-relaxed border border-gray-200 mt-4">
                                <span className="font-bold text-red-600 block mb-1">법적 책임 동의 (필수)</span>
                                본인은 위챗봇 인터뷰 및 OSINT 기록과 상관없이 상대방을 악의적으로 음해할 목적이 없으며, 만약 허위 신고로 밝혀질 경우 이용약관 제9조에 의거하여 즉각적인 계정 정지 및 민형사상 책임을 질 수 있음에 동의합니다. (docs/legal 참조)
                            </div>

                            <Button type="submit" variant="destructive" className="w-full mt-4">
                                동의 및 신고 제출
                            </Button>
                            <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                                취소
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4 py-8 animate-in fade-in zoom-in">
                            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold">임시 제한 조치 발동</h3>
                            <p className="text-gray-600 text-sm">
                                신고가 접수되었습니다. 상대방의 계정은 현재 **'검증 보류(PENDING)'** 상태로 전환되었으며,
                                자동 영구 정지 없이 관리자 리뷰를 거쳐 페널티가 최종 확정됩니다.
                            </p>

                            <Button onClick={() => router.push('/admin')} className="mt-6 w-full bg-black text-white">
                                관리자(Admin) 콘솔로 이동하여 처리하기
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
