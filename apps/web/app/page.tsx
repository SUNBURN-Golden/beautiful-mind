'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SignatureModal } from '@/components/SignatureModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateUserStatus } from '@/app/actions/userStatus';
import { OnboardingStatus } from '@soulbound/core';

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<OnboardingStatus>('PENDING_CONSENT');

  const handleSaveSignature = async (base64Url: string) => {
    setSignature(base64Url);

    // 임시 더미 데이터로 Agent C 상태 계산 검증
    const result = await updateUserStatus(
      'temp-user-id',
      { verified: true, reputation_score: 100 },
      { osint_granted: true, location_granted: true, device_granted: true },
      { agreed_to_terms: true, signature_base64: base64Url },
      { decision: 'APPROVED', score: 95 }
    );
    setStatus(result.status);
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SoulBound MVP Dashboard</h1>
        <p className="text-gray-500 mt-2">안전하고 투명한 환경을 구성하는 검증 시스템입니다.</p>
      </div>

      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/consent">Consent Hub 열기 (동의 화면 테스트)</Link>
        </Button>
        <Button onClick={() => setIsModalOpen(true)}>
          확약서 서명하기 (서명 모달 테스트)
        </Button>
      </div>

      {signature && (
        <Card>
          <CardHeader>
            <CardTitle>제출된 서명 데이터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded bg-gray-50 p-2">
              <img src={signature} alt="사용자 서명" className="h-32 object-contain" />
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto">
              <h3 className="text-gray-400 mb-2">// Agent C Core Logic Result</h3>
              <p>User Status: [ {status} ]</p>
            </div>
          </CardContent>
        </Card>
      )}

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSignature}
      />
    </main>
  );
}
