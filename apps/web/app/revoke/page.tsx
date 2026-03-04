'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function ConsentRevokeTestPage() {
    const [consentOsint, setConsentOsint] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
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

            const data = await res.json();

            if (!res.ok) {
                // API 레벨의 차단 확인
                setErrorMsg(`API 에러 (${res.status}): ${data.message} [${data.error}]`);
            } else {
                setReportData(data.data);
            }
        } catch (err: any) {
            setErrorMsg('네트워크 또는 알 수 없는 오류 발생');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-100 flex items-center justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Consent Revoke Test</CardTitle>
                    <CardDescription>
                        OSINT 동의 상태(ON/OFF)에 따른 API 차단 및 UI 잠금 방어 로직 검증.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-1">
                            <Label htmlFor="osint-toggle" className="text-base font-semibold">OSINT 웹 평판 / 신뢰도 검증</Label>
                            <p className="text-sm text-gray-500">동의 철회 시 리포트 갱신 및 API 접근이 차단됩니다.</p>
                        </div>
                        <Switch
                            id="osint-toggle"
                            checked={consentOsint}
                            onCheckedChange={setConsentOsint}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>OSINT 신뢰도 분석 리포트 관리</Label>

                        {/* UI 잠금 (Disabled State) 처리 */}
                        <Button
                            onClick={handleGenerateReport}
                            className="w-full"
                            disabled={!consentOsint || isGenerating}
                            variant={consentOsint ? 'default' : 'secondary'}
                        >
                            {!consentOsint ? '동의 철회됨 (생성 불가)' : isGenerating ? '분석 중...' : 'OSINT 리포트 생성 시도'}
                        </Button>

                        {isGenerating && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        )}

                        {errorMsg && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
                                ❌ {errorMsg}
                                <p className="mt-2 text-xs text-gray-500">
                                    UI에서 임의로 버튼 disabled를 해제하더라도 서버/API 단에서 위와 같이 차단됨. 앱은 다운되지 않음.
                                </p>
                            </div>
                        )}

                        {reportData && (
                            <div className="text-sm space-y-2 text-gray-600 bg-green-50 border border-green-200 rounded p-4">
                                <p className="text-green-800 font-semibold mb-2">✅ 리포트 정상 생성 (동의 상태: ON)</p>
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
