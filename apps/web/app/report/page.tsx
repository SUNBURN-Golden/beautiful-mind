'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-pane liquid-rise w-full max-w-md rounded-3xl border-[#e5e5e7]">
                <CardHeader className="rounded-t-3xl border-b border-[#f3d1d1] bg-[#fff5f5] text-[#7f1d1d]">
                    <CardTitle className="text-center text-[28px] font-semibold tracking-tight">악성 유저 신고</CardTitle>
                    <CardDescription className="mt-1 text-center text-[#9f3434]">
                        허위 신고 확정 시 역패널티가 적용됩니다. 사실 기반으로 작성하세요.
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
                            <div className="mt-4 rounded-xl border border-[#f3d1d1] bg-[#fff8f8] p-3 text-justify text-xs leading-relaxed text-[#6e6e73]">
                                <span className="mb-1 block font-semibold text-[#b42318]">법적 책임 동의 (필수)</span>
                                본인은 상대방을 악의적으로 음해할 목적이 없으며, 허위 신고로 확인될 경우 이용약관 제9조에 따라 계정 제한 및 법적 책임이 발생할 수 있음에 동의합니다.
                            </div>

                            <Button type="submit" variant="destructive" className="mt-4 h-12 w-full">
                                동의 후 신고 제출
                            </Button>
                            <Button type="button" variant="outline" className="h-12 w-full" onClick={() => router.back()}>
                                취소
                            </Button>
                        </form>
                    ) : (
                        <div className="animate-in fade-in zoom-in space-y-4 py-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#f4d6b8] bg-[#fff4d8] text-sm font-semibold text-[#9a3412]">
                                경고
                            </div>
                            <h3 className="text-[22px] font-semibold text-[#1d1d1f]">임시 제한 조치 발동</h3>
                            <p className="text-sm text-[#6e6e73]">
                                신고가 접수되어 대상 계정은 검증 보류 상태로 전환되었습니다. 자동 영구 정지는 없으며 관리자 심사 후 최종 조치가 확정됩니다.
                            </p>

                            <Button onClick={() => router.push('/admin')} className="mt-6 h-12 w-full">
                                관리자 콘솔에서 처리
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
