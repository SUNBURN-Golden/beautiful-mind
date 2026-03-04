'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type RemoteDbProfile = {
    id: string;
    email: string;
    reputation_score: number;
    created_at: string;
};

type RemoteDbResult = {
    user: { id: string };
    profile: RemoteDbProfile;
};

function parseErrorMessage(value: unknown): string {
    if (value && typeof value === 'object') {
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.error === 'string') {
            return candidate.error;
        }
    }
    return '알 수 없는 오류';
}

export default function RemoteDbTestClient() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RemoteDbResult | null>(null);
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

            const data: unknown = await res.json();

            if (!res.ok) {
                throw new Error(parseErrorMessage(data));
            }

            setResult(data as RemoteDbResult);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '알 수 없는 오류';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-8">
            <Card className="liquid-pane liquid-rise w-full max-w-2xl rounded-3xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-[28px] font-semibold tracking-tight">원격 Supabase DB 통합 테스트</CardTitle>
                    <CardDescription>
                        원격 Supabase의 `auth.users` 에 새 사용자를 가입시키고, `public.profiles` 테이블에 데이터가 성공적으로 적재되는지 검증합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="liquid-pane-muted rounded-xl p-4 text-sm text-[#3a3a3c]">
                        <p><strong>생성될 테스트 이메일:</strong> {testEmail}</p>
                        <p><strong>비밀번호:</strong> {testPassword}</p>
                    </div>

                    <Button
                        onClick={handleTestRemoteDB}
                        disabled={loading}
                        className="h-12 w-full"
                        variant={result ? "secondary" : "default"}
                    >
                        {loading ? '테스트 진행 중...' : '원격 가입 및 프로필 적재 테스트 시작'}
                    </Button>

                    {error && (
                        <div className="rounded-md border border-[#f3d1d1] bg-[#fff5f5] p-4 text-[#b42318]">
                            <p className="font-bold">에러 발생</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-2 rounded-md border border-[#cde8d4] bg-[#edf9f1] p-4 text-[#14532d]">
                            <p className="text-lg font-bold">성공: 원격 DB 적재 완료</p>
                            <div className="text-sm space-y-1">
                                <p><strong>auth.users ID:</strong> {result.user.id}</p>
                                <hr className="my-2 border-[#cde8d4]" />
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
