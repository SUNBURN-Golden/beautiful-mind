'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type OsintReportData = {
    trustScore: number;
    socialFootprint: string;
};

type MockOsintResponse = {
    message?: string;
    error?: string;
    data?: OsintReportData;
};

export default function ConsentRevokeTestPage() {
    const [consentOsint, setConsentOsint] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<OsintReportData | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setErrorMsg(null);
        setReportData(null);

        try {
            // Mock API를 통해 동의 상태 전달 (실제는 DB를 참조하겠지만 클라이언트 테스트용으로 전송)
            const res = await fetch('/api/mock-osint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consent_osint: consentOsint })
            });

            const data = await res.json() as MockOsintResponse;

            if (!res.ok) {
                // API 레벨의 차단 확인
                setErrorMsg(`API 에러 (${res.status}): ${data.message} [${data.error}]`);
            } else if (data.data) {
                setReportData(data.data);
            }
        } catch {
            setErrorMsg('네트워크 또는 알 수 없는 오류 발생');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-8">
            <Card className="liquid-pane liquid-rise w-full max-w-lg rounded-3xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-[28px] font-semibold tracking-tight">Consent Revoke Test</CardTitle>
                    <CardDescription>
                        OSINT 동의 ON/OFF에 따른 API 차단 및 UI 잠금 동작을 검증합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[#ececf0] pb-4">
                        <div className="space-y-1">
                            <Label htmlFor="osint-toggle" className="text-base font-semibold">OSINT 평판 검증</Label>
                            <p className="text-sm text-[#6e6e73]">동의 철회 시 리포트 갱신 및 API 접근이 차단됩니다.</p>
                        </div>
                        <Switch id="osint-toggle" checked={consentOsint} onCheckedChange={setConsentOsint} />
                    </div>

                    <div className="space-y-4">
                        <Label>OSINT 리포트 관리</Label>

                        <Button
                            onClick={handleGenerateReport}
                            className="h-12 w-full"
                            disabled={!consentOsint || isGenerating}
                            variant={consentOsint ? 'default' : 'secondary'}
                        >
                            {!consentOsint ? '동의 철회됨 (생성 불가)' : isGenerating ? '분석 중...' : 'OSINT 리포트 생성 시도'}
                        </Button>

                        {isGenerating && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-[#8e8e93]" />
                            </div>
                        )}

                        {errorMsg && (
                            <div className="rounded-md border border-[#f3d1d1] bg-[#fff5f5] p-4 text-sm text-[#b42318]">
                                {errorMsg}
                                <p className="mt-2 text-xs text-[#6e6e73]">
                                    UI에서 버튼 잠금을 우회하더라도 서버 레벨에서 차단되어 앱 안정성은 유지됩니다.
                                </p>
                            </div>
                        )}

                        {reportData && (
                            <div className="space-y-2 rounded-xl border border-[#cde8d4] bg-[#edf9f1] p-4 text-sm text-[#3a3a3c]">
                                <p className="mb-2 font-semibold text-[#14532d]">리포트 정상 생성 (동의 상태: ON)</p>
                                <div className="flex justify-between">
                                    <span>신뢰 점수:</span> <span className="font-bold">{reportData.trustScore}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>발자국:</span> <span className="font-bold">{reportData.socialFootprint}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
