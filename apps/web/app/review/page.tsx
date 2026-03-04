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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">매칭 리뷰 작성</CardTitle>
                    <CardDescription className="text-center">상대방과의 만남은 어떠셨나요? 긍정적인 평가가 누적되면 신뢰 티어가 상승합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {!isSubmitted ? (
                        <div className="space-y-4">
                            <Label>긍정 평가 태그 (다중 선택 가능)</Label>
                            <div className="flex flex-col gap-3 border rounded-md p-4 bg-white">
                                {TAGS.map(tag => (
                                    <div key={tag} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={tag}
                                            checked={selectedTags.includes(tag)}
                                            onCheckedChange={() => toggleTag(tag)}
                                        />
                                        <Label htmlFor={tag} className="cursor-pointer font-normal">{tag}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in py-8">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">🎉</span>
                            </div>
                            <h3 className="text-xl font-bold">리뷰 제출 완료!</h3>
                            <p className="text-gray-500">상호 긍정적인 평가를 받아 신뢰도 티어가 상승했습니다.</p>

                            <div className="bg-gray-100 p-4 rounded-md mt-4">
                                <p className="font-mono text-sm text-gray-700">티어 점수 변화 (User A):</p>
                                <div className="flex items-center justify-center gap-4 mt-2">
                                    <span className="text-2xl font-bold text-gray-400">100</span>
                                    <span className="text-xl text-green-500">→</span>
                                    <span className="text-3xl font-bold text-green-600">110</span>
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {!isSubmitted ? (
                        <Button className="w-full" onClick={handleSubmit} disabled={selectedTags.length === 0}>
                            리뷰 제출하기
                        </Button>
                    ) : (
                        <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                            대시보드로 돌아가기
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
