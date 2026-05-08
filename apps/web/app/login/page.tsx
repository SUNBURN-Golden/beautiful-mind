'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { login, type AuthState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeedbackPanel } from '@/components/ui-kit';

const initialState: AuthState = {};

export default function LoginPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(login, initialState);

    React.useEffect(() => {
        if (state?.success) {
            router.replace('/apply/status');
        }
    }, [state, router]);

    return (
        <div className="sb-space-stage-antiquarian flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
            <Card className="liquid-rise w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[rgba(241,233,219,0.16)] bg-[rgba(240,229,210,0.96)] shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
                <CardHeader className="space-y-4 pb-5 text-center">
                    <div className="mx-auto inline-flex rounded-full border border-[rgba(30,40,35,0.14)] bg-white/55 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#6e6254]">
                        Limited access. Boundless conversation.
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="sb-type-serif-display text-center text-[2.2rem] leading-tight tracking-[-0.04em] text-[#1E2823]">
                            내 스페이스로 돌아가기
                        </CardTitle>
                        <CardDescription className="mx-auto max-w-sm text-center text-[0.95rem] leading-7 text-[#63594c]">
                            신뢰가 SOUL이 됩니다. 로그인하면 지금 이어가야 할 신뢰 여정으로 연결됩니다.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <FeedbackPanel
                            tone="info"
                            title="안전한 입장을 먼저 확인합니다"
                            description="SoulBound는 증명과 검증을 거친 뒤 대화 공간을 엽니다."
                        />
                    </div>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="m@example.com"
                                required
                                data-testid="login-email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                data-testid="login-password"
                            />
                        </div>
                        {state?.error && (
                            <div role="alert" aria-live="polite">
                                <FeedbackPanel tone="error" title="로그인 실패" description={state.error} />
                            </div>
                        )}
                        <Button type="submit" disabled={isPending} className="w-full" data-testid="login-submit">
                            {isPending ? '이어가는 중...' : 'SoulBound로 계속하기'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-[rgba(30,40,35,0.12)] bg-white/35 p-4">
                    <div className="flex flex-col items-center gap-1.5">
                        <Button asChild variant="link">
                            <Link href="/signup">처음이라면 SoulBound 시작하기</Link>
                        </Button>
                        <Button asChild variant="link">
                            <Link href="/manual">신뢰 가이드 읽기</Link>
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
