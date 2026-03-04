'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const TAGS = ['시간 약속을 잘 지켜요', '친절하고 배려심이 깊어요', '사진과 실물이 같아요', '대화가 잘 통했어요', '또 만나고 싶어요'];

export default function ReviewPage() {
    const router = useRouter();
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
    };

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-pane liquid-rise w-full max-w-md rounded-3xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-[28px] font-semibold tracking-tight">매칭 리뷰</CardTitle>
                    <CardDescription className="text-center">
                        만남 경험을 평가하면 신뢰도 계산에 반영됩니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!isSubmitted ? (
                        <div className="space-y-4">
                            <Label className="text-[14px]">긍정 평가 태그 (복수 선택)</Label>
                            <div className="liquid-pane-muted flex flex-col gap-3 rounded-2xl p-4">
                                {TAGS.map((tag) => (
                                    <div key={tag} className="flex items-center space-x-2">
                                        <Checkbox id={tag} checked={selectedTags.includes(tag)} onCheckedChange={() => toggleTag(tag)} />
                                        <Label htmlFor={tag} className="cursor-pointer font-normal text-[#3a3a3c]">
                                            {tag}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in space-y-4 py-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#cde8d4] bg-[#edf9f1] text-sm font-semibold text-[#14532d]">
                                완료
                            </div>
                            <h3 className="text-[22px] font-semibold text-[#1d1d1f]">리뷰 제출 완료</h3>
                            <p className="text-[#6e6e73]">상호 평가가 반영되어 신뢰도 티어가 갱신되었습니다.</p>

                            <div className="mt-4 rounded-2xl border border-[#e5e5e7] bg-[#f5f5f7] p-4">
                                <p className="text-sm text-[#3a3a3c]">티어 점수 변화 (User A)</p>
                                <div className="mt-2 flex items-center justify-center gap-4">
                                    <span className="text-2xl font-semibold text-[#8e8e93]">100</span>
                                    <span className="text-xl text-[#06c]">→</span>
                                    <span className="text-3xl font-semibold text-[#1d1d1f]">110</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t border-[#ececf0] bg-[#fbfbfd]">
                    {!isSubmitted ? (
                        <Button className="h-12 w-full" onClick={handleSubmit} disabled={selectedTags.length === 0}>
                            리뷰 제출
                        </Button>
                    ) : (
                        <Button variant="outline" className="h-12 w-full" onClick={() => router.push('/')}>
                            대시보드로 이동
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
