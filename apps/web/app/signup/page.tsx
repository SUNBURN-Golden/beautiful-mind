'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { signup } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeedbackPanel } from '@/components/ui-kit';

const initialState = { error: '', success: false };

export default function SignupPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(signup, initialState);

    React.useEffect(() => {
        if (state?.success) {
            router.push('/login');
        }
    }, [state, router]);

    return (
        <div className="sb-space-stage-antiquarian flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
            <Card className="liquid-rise w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[rgba(241,233,219,0.16)] bg-[rgba(240,229,210,0.96)] shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
                <CardHeader className="space-y-4 pb-5 text-center">
                    <div className="mx-auto inline-flex rounded-full border border-[rgba(30,40,35,0.14)] bg-white/55 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#6e6254]">
                        Trust becomes SOUL.
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="sb-type-serif-display text-center text-[2.2rem] leading-tight tracking-[-0.04em] text-[#1E2823]">
                            증명에서 시작해,
                            <span className="block">신뢰를 SOUL로 얻습니다.</span>
                        </CardTitle>
                        <CardDescription className="mx-auto max-w-sm text-center text-[0.95rem] leading-7 text-[#63594c]">
                            SoulBound는 먼저 안전을 확인하고, 검증된 사람에게 대화 공간을 엽니다.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <FeedbackPanel
                            tone="info"
                            title="입장은 까다롭게. 대화는 자유롭게."
                            description="계정을 만든 뒤 증명과 검증을 이어가면 SOUL이 신뢰의 기록이 됩니다."
                        />
                    </div>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input id="name" name="name" autoComplete="name" required placeholder="홍길동" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="m@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" name="password" type="password" autoComplete="new-password" required />
                        </div>
                        {state?.error && (
                            <div role="alert" aria-live="polite">
                                <FeedbackPanel tone="error" title="회원가입 실패" description={state.error} />
                            </div>
                        )}
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? '시작하는 중...' : 'SoulBound 시작하기'}
                        </Button>
                        <Button type="button" variant="outline" disabled={isPending} className="w-full" onClick={() => router.push('/login')}>
                            로그인으로 돌아가기
                        </Button>
                        <Button asChild type="button" variant="link" disabled={isPending} className="w-full">
                            <Link href="/manual">가입 전 신뢰 가이드 읽기</Link>
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
