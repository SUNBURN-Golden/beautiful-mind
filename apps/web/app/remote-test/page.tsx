'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RemoteDbTestPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testEmail = `testuser_${Math.random().toString(36).substring(7)}@test.com`;
    const testPassword = 'SecurePassword123!';

    const handleTestRemoteDB = async () => {
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const res = await fetch('/api/test-remote-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail, password: testPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '알 수 없는 오류');
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>원격 Supabase DB 통합 테스트 (Agent B)</CardTitle>
                    <CardDescription>
                        원격 Supabase의 `auth.users` 에 새 사용자를 가입시키고, `public.profiles` 테이블에 데이터가 성공적으로 적재되는지 검증합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-100 p-4 rounded text-sm font-mono text-gray-700">
                        <p><strong>생성될 테스트 이메일:</strong> {testEmail}</p>
                        <p><strong>비밀번호:</strong> {testPassword}</p>
                    </div>

                    <Button
                        onClick={handleTestRemoteDB}
                        disabled={loading}
                        className="w-full"
                        variant={result ? "secondary" : "default"}
                    >
                        {loading ? '테스트 진행 중...' : '원격 가입 및 프로필 적재 테스트 시작'}
                    </Button>

                    {error && (
                        <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-md">
                            <p className="font-bold">❌ 에러 발생</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="bg-green-50 text-green-800 border border-green-200 p-4 rounded-md space-y-2">
                            <p className="font-bold text-lg">✅ 성공! 원격 DB 적재 완료</p>
                            <div className="text-sm space-y-1">
                                <p><strong>auth.users ID:</strong> {result.user.id}</p>
                                <hr className="border-green-200 my-2" />
                                <p><strong>profiles.id:</strong> {result.profile.id}</p>
                                <p><strong>profiles.email:</strong> {result.profile.email}</p>
                                <p><strong>profiles.reputation_score:</strong> {result.profile.reputation_score}</p>
                                <p><strong>profiles.created_at:</strong> {new Date(result.profile.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
