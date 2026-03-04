'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveContract } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignatureModal } from '@/components/SignatureModal';

export default function ContractPage() {
    const router = useRouter();

    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        penalty: false,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const allChecked = agreements.terms && agreements.privacy && agreements.penalty;

    const handleToggle = (key: keyof typeof agreements) => {
        setAgreements(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveSignature = (base64Url: string) => {
        setSignature(base64Url);
    };

    const handleNext = () => {
        if (allChecked && signature) {
            startTransition(() => {
                saveContract(signature).then((res) => {
                    if (res?.error) alert(res.error);
                });
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">온보딩 약관 및 확약서</CardTitle>
                    <CardDescription className="text-center">서비스 이용을 위해 아래 내용에 동의하고 서명해주세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="h-48 overflow-y-scroll border p-4 bg-white rounded-md text-sm text-gray-700">
                        <h3 className="font-bold mb-2">서비스 이용약관 및 개인정보 처리방침</h3>
                        <p className="mb-4">제1조 (목적) 본 약관은 Beautiful Mind 서비스의 권리, 의무를 규정함을 목적으로 합니다...</p>
                        <p className="mb-4">제2조 (개인정보 수집) OSINT 분석, 위치 정보 등 민감 정보가 신뢰 검증 목적으로 수집될 수 있습니다...</p>
                        <p className="mb-4">제3조 (패널티 정책) 허위 신고나 담합 적발 시 계정 영구 정지 등 강력한 조치가 취해질 수 있습니다...</p>
                        <p className="mb-4">...</p>
                        <p className="mb-4">...</p>
                        <p>(본 내용은 docs/legal에서 불러온 더미 데이터입니다.)</p>
                    </div>

                    <div className="space-y-4 border-b pb-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" checked={agreements.terms} onCheckedChange={() => handleToggle('terms')} />
                            <Label htmlFor="terms" className="cursor-pointer">(필수) 서비스 이용약관 동의</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="privacy" checked={agreements.privacy} onCheckedChange={() => handleToggle('privacy')} />
                            <Label htmlFor="privacy" className="cursor-pointer">(필수) 개인정보 처리방침 동의</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="penalty" checked={agreements.penalty} onCheckedChange={() => handleToggle('penalty')} />
                            <Label htmlFor="penalty" className="cursor-pointer">(필수) 악용 시 패널티 부과 정책 확인 및 동의</Label>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label>최종 확약 서명</Label>
                        {signature ? (
                            <div className="flex items-center justify-between border p-2 rounded bg-green-50">
                                <span className="text-green-700 font-medium">✓ 서명이 완료되었습니다.</span>
                                <Button variant="outline" size="sm" onClick={() => setSignature(null)}>다시 서명하기</Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full h-12"
                                disabled={!allChecked}
                                onClick={() => setIsModalOpen(true)}
                            >
                                📝 확약서 서명하기 (체크박스 모두 동의 후 활성화)
                            </Button>
                        )}
                    </div>

                    <Button
                        className="w-full h-12 text-md mt-6"
                        disabled={!allChecked || !signature || isPending}
                        onClick={handleNext}
                    >
                        {isPending ? '업로드 중...' : '동의 완료 및 Consent Hub로 이동'}
                    </Button>
                </CardContent>
            </Card>

            <SignatureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSignature}
            />
        </div>
    );
}
