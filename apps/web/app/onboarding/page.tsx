'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as PortOne from '@portone/browser-sdk/v2';
import { saveProfile } from '@/app/actions/onboarding';
import { verifyIdentity } from '@/app/actions/identity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function OnboardingPage() {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(false);

    const [isPending, startTransition] = useTransition();

    const handlePortOneVerification = async () => {
        try {
            const verificationId = `verify-${crypto.randomUUID()}`;
            const response = await PortOne.requestIdentityVerification({
                storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
                channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
                identityVerificationId: verificationId,
            });

            if (response?.code !== undefined) {
                // 오류 발생
                alert(`인증 실패: ${response.message}`);
                return;
            }

            // 본인인증 성공 시, 서버로 검증 요청
            const verifyResult = await verifyIdentity(response.identityVerificationId);

            if (verifyResult.success) {
                setIsVerified(true);
            } else {
                alert(`인증 검증 실패: ${verifyResult.error}`);
            }
        } catch (error: any) {
            console.error('PortOne Verification Error:', error);
            alert('인증 중 오류가 발생했습니다.');
        }
    };

    const handleNext = () => {
        if (isVerified) {
            startTransition(() => {
                saveProfile().then((res) => {
                    if (res?.error) alert(res.error);
                });
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">초기 온보딩</CardTitle>
                    <CardDescription className="text-center">서비스 사용을 위한 기본 프로필 및 본인 인증</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>본인 확인 (PortOne)</Label>
                        <div className="flex gap-2">
                            <Button
                                variant={isVerified ? "outline" : "default"}
                                onClick={handlePortOneVerification}
                                disabled={isVerified}
                                className="w-full"
                            >
                                {isVerified ? '✓ 본인인증 완료' : '본인 인증 진행하기'}
                            </Button>
                        </div>
                    </div>

                    {isVerified && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="nickname">닉네임</Label>
                                <Input id="nickname" placeholder="서비스에서 사용할 이름" defaultValue="신뢰자1" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bio">자기소개</Label>
                                <Input id="bio" placeholder="직업, 성향 등" defaultValue="정직하게 활동합니다." />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        disabled={!isVerified || isPending}
                        onClick={handleNext}
                    >
                        {isPending ? '처리 중...' : '기본 프로필 저장 & 계약서 작성으로'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
