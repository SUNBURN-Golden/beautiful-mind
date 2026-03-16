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
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-rise w-full max-w-md border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-semibold tracking-tight">회원가입</CardTitle>
                    <CardDescription className="text-center">
                        계정 생성 후 즉시 admission 신청 절차(`/apply/*`)로 진입합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <FeedbackPanel
                            tone="info"
                            title="가입 후 흐름"
                            description="가입 완료 후 로그인 페이지로 이동하며, 로그인 시 `/apply/status`로 자동 정렬됩니다."
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
                            {isPending ? '가입 중...' : '가입하기'}
                        </Button>
                        <Button type="button" variant="outline" disabled={isPending} className="w-full" onClick={() => router.push('/login')}>
                            취소
                        </Button>
                        <Button asChild type="button" variant="link" disabled={isPending} className="w-full">
                            <Link href="/manual">가입 전 admission 매뉴얼 보기</Link>
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
