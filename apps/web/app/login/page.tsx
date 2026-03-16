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
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-rise w-full max-w-md border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-semibold tracking-tight">SoulBound</CardTitle>
                    <CardDescription className="text-center">
                        로그인 후 자동으로 admission 상태 페이지(`/apply/status`)로 이동합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <FeedbackPanel
                            tone="info"
                            title="입장 전 상태 확인"
                            description="로그인 직후 현재 admission 단계에 맞는 화면으로 자동 정렬됩니다."
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
                            {isPending ? '로그인 중...' : '로그인'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-[#e5e5e7] p-4">
                    <div className="flex flex-col items-center gap-1.5">
                        <Button asChild variant="link">
                            <Link href="/signup">계정이 없으신가요? 회원가입</Link>
                        </Button>
                        <Button asChild variant="link">
                            <Link href="/manual">Admission 매뉴얼 보기</Link>
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
