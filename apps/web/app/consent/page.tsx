'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { saveConsents } from '@/app/actions/onboarding';

export default function ConsentHub() {
    const router = useRouter();
    const [consents, setConsents] = useState({
        osint: false,
        location: false,
        device: false,
    });
    const [isPending, startTransition] = useTransition();

    const handleToggle = (key: keyof typeof consents) => {
        setConsents(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // 모든 권한이 허용되어야 특정 버튼 활성화
    const allGranted = consents.osint && consents.location && consents.device;

    const handleNext = () => {
        if (allGranted) {
            startTransition(() => {
                saveConsents(consents).then((res) => {
                    if (res?.error) alert(res.error);
                });
            });
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Consent Hub (권한 동의 허브)</h1>
                <p className="text-gray-500">
                    고객님의 정보는 오직 고객님의 철저한 통제 하에 있습니다. 각 검증 모듈을 활성화해주세요.
                </p>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">OSINT 웹 평판 / 신뢰도 검증</CardTitle>
                            <CardDescription>공개된 소셜 데이터를 기반으로 평판을 측정합니다.</CardDescription>
                        </div>
                        <Switch checked={consents.osint} onCheckedChange={() => handleToggle('osint')} />
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">실시간 위치 교차 검증</CardTitle>
                            <CardDescription>허위 위치 시도(Spoofing)를 방지하기 위해 네트워크/GPS를 대조합니다.</CardDescription>
                        </div>
                        <Switch checked={consents.location} onCheckedChange={() => handleToggle('location')} />
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">기기 무결성 검증</CardTitle>
                            <CardDescription>Jailbreak, Rooting 등 시스템 조작 여부를 확인합니다.</CardDescription>
                        </div>
                        <Switch checked={consents.device} onCheckedChange={() => handleToggle('device')} />
                    </CardHeader>
                </Card>
            </div>

            <div className="pt-6 border-t border-gray-200">
                <Button
                    className="w-full h-12 text-md"
                    disabled={!allGranted || isPending}
                    onClick={handleNext}
                >
                    {isPending ? '저장 중...' : (allGranted ? '모든 권한 동의 완료 - 다음 단계로' : '모든 권한을 허용해주세요')}
                </Button>
            </div>
        </div>
    );
}
